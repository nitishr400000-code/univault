import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import "@univault/db/test/setup";
import { createDb } from "@univault/db";
import { user } from "@univault/db/schema/auth";
import { item, itemPhoto } from "@univault/db/schema/items";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { LocalPhotoStorage } from "../local-photo-storage";
import { appRouter } from "./index";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:password@localhost:5433/univault_test";
const db = createDb({ DATABASE_URL: testDatabaseUrl });
const photoBytes = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  webp: Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]),
};

let storageDirectory: string;
const photoStorage = () => new LocalPhotoStorage(storageDirectory);

const session = (
  userId: string,
  role: "student" | "staff",
  emailVerified = true
) =>
  ({
    session: {
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      id: `session-${userId}`,
      token: `token-${userId}`,
      updatedAt: new Date(),
      userId,
    },
    user: {
      createdAt: new Date(),
      email: `${userId}@college.edu`,
      emailVerified,
      id: userId,
      name: userId,
      role,
      updatedAt: new Date(),
    },
  }) as never;

describe("found item creation", () => {
  beforeAll(async () => {
    storageDirectory = await mkdtemp(path.join(tmpdir(), "univault-photos-"));
    await db.insert(user).values([
      {
        email: "student@college.edu",
        emailVerified: true,
        id: "student-1",
        name: "Campus Student",
      },
      {
        email: "staff@college.edu",
        emailVerified: true,
        id: "staff-1",
        name: "Campus Staff",
        role: "staff",
      },
    ]);
  });

  afterAll(async () => {
    await db.$client.end();
    await rm(storageDirectory, { force: true, recursive: true });
  });

  it("creates active posts with ordered JPEG, PNG, and WebP photos that signed-in users can read", async () => {
    const caller = appRouter.createCaller({
      auth: {} as never,
      db,
      headers: new Headers(),
      photoStorage: photoStorage(),
      session: session("student-1", "student"),
    });
    const created = await caller.items.create({
      category: "Electronics",
      description: "Black earbuds with a blue case",
      foundAt: "2026-11-06",
      photos: [
        {
          contentType: "image/jpeg",
          dataBase64: photoBytes.jpeg.toString("base64"),
        },
        {
          contentType: "image/png",
          dataBase64: photoBytes.png.toString("base64"),
        },
        {
          contentType: "image/webp",
          dataBase64: photoBytes.webp.toString("base64"),
        },
      ],
      placeFound: "Library",
      title: "Earbuds",
    });
    const [storedItem] = await db
      .select()
      .from(item)
      .where(eq(item.id, created.id));
    const storedPhotos = await db
      .select()
      .from(itemPhoto)
      .where(eq(itemPhoto.itemId, created.id));

    expect(storedItem).toMatchObject({ status: "Active" });
    expect(storedPhotos.map(({ position }) => position)).toEqual([0, 1, 2]);
    const [firstPhoto] = storedPhotos;
    if (!firstPhoto) {
      throw new Error("The created item should have its first photo.");
    }

    const otherSignedInUser = appRouter.createCaller({
      auth: {} as never,
      db,
      headers: new Headers(),
      photoStorage: photoStorage(),
      session: session("staff-1", "staff"),
    });
    const served = await otherSignedInUser.items.photo({
      photoId: firstPhoto.id,
    });
    expect(served).toEqual({
      contentType: "image/jpeg",
      dataBase64: photoBytes.jpeg.toString("base64"),
    });

    const unverifiedUser = appRouter.createCaller({
      auth: {} as never,
      db,
      headers: new Headers(),
      photoStorage: photoStorage(),
      session: session("student-1", "student", false),
    });
    await expect(
      unverifiedUser.items.photo({ photoId: firstPhoto.id })
    ).resolves.toEqual(served);

    await expect(
      otherSignedInUser.items.create({
        category: "Other",
        description: "Small umbrella",
        foundAt: "2026-11-06",
        photos: [
          {
            contentType: "image/png",
            dataBase64: photoBytes.png.toString("base64"),
          },
        ],
        placeFound: "South entrance",
        title: "Umbrella",
      })
    ).resolves.toEqual({ id: expect.any(String) });
  });
});
