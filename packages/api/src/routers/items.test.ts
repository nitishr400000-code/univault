import { describe, expect, it, vi } from "vitest";

import { appRouter } from "./index";

const session = {
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
    emailVerified: true,
    id: "student-1",
    name: "Campus Student",
    role: "student",
    updatedAt: new Date(),
  },
} as never;

const newItem = {
  category: "Electronics",
  description: "Black earbuds with a blue case",
  foundAt: "2026-11-06",
  photos: [
    {
      contentType: "image/png",
      dataBase64: Buffer.from("GIF89a").toString("base64"),
    },
  ],
  placeFound: "Library",
  title: "Earbuds",
};

interface ItemCaller {
  items: { create: (input: typeof newItem) => Promise<unknown> };
}

describe("found item photos", () => {
  it("rejects an image when its bytes do not match its declared type", async () => {
    const caller = appRouter.createCaller({
      db: {} as never,
      photoStorage: { read: vi.fn(), save: vi.fn() } as never,
      session,
    }) as unknown as ItemCaller;

    await expect(caller.items.create(newItem)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
