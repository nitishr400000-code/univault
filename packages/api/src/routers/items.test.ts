import { describe, expect, it, vi } from "vitest";

import { appRouter } from "./index";

const session = (role = "student", emailVerified = true) =>
  ({
    session: {
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      id: "session-id",
      token: "session-token",
      updatedAt: new Date(),
      userId: "student-1",
    },
    user: {
      createdAt: new Date(),
      email: "student@college.edu",
      emailVerified,
      id: "student-1",
      name: "Campus Student",
      role,
      updatedAt: new Date(),
    },
  }) as never;

const pngPhoto = {
  contentType: "image/png",
  dataBase64: Buffer.from("GIF89a").toString("base64"),
};

const newItem = {
  category: "Electronics",
  description: "Black earbuds with a blue case",
  foundAt: "2026-11-06",
  photos: [pngPhoto],
  placeFound: "Library",
  title: "Earbuds",
};

interface ItemCaller {
  items: {
    create: (input: typeof newItem) => Promise<unknown>;
    photo: (input: { photoId: string }) => Promise<unknown>;
  };
}

const createCaller = (userSession: unknown = session()) =>
  appRouter.createCaller({
    auth: {} as never,
    db: {} as never,
    headers: new Headers(),
    photoStorage: { delete: vi.fn(), read: vi.fn(), save: vi.fn() } as never,
    session: userSession as never,
  }) as unknown as ItemCaller;

describe("found item photos", () => {
  it("rejects an image when its bytes do not match its declared type", async () => {
    await expect(createCaller().items.create(newItem)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("requires every item field and a supported category", async () => {
    const caller = createCaller();
    await expect(
      caller.items.create({ ...newItem, title: "   " })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.items.create({ ...newItem, category: "Books" } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.items.create({ ...newItem, foundAt: "not-a-date" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires one to five photos", async () => {
    const caller = createCaller();
    await expect(
      caller.items.create({ ...newItem, photos: [] })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.items.create({
        ...newItem,
        photos: Array.from({ length: 6 }, () => ({ ...pngPhoto })),
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts only JPEG, PNG, and WebP content types", async () => {
    await expect(
      createCaller().items.create({
        ...newItem,
        photos: [
          {
            contentType: "image/gif",
            dataBase64: pngPhoto.dataBase64,
          },
        ],
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects photos larger than five megabytes", async () => {
    const tooLarge = Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64");
    await expect(
      createCaller().items.create({
        ...newItem,
        photos: [{ contentType: "image/png", dataBase64: tooLarge }],
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects photo access without a signed-in session", async () => {
    await expect(
      createCaller(null).items.photo({ photoId: "photo-1" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses posts from system admins and unverified users", async () => {
    await expect(
      createCaller(session("system_admin")).items.create(newItem)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      createCaller(session("student", false)).items.create(newItem)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
