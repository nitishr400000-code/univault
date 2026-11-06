import "@univault/db/test/setup";
import { createDb } from "@univault/db";
import { user } from "@univault/db/schema/auth";
import { item, itemPhoto } from "@univault/db/schema/items";
import { beforeEach, describe, expect, it } from "vitest";

import { appRouter } from "./index";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:password@localhost:5433/univault_test";
const db = createDb({ DATABASE_URL: testDatabaseUrl });
const posterEmail = "poster-private@college.edu";
const posterId = "item-search-poster";
const itemIds = {
  claimed: crypto.randomUUID(),
  description: crypto.randomUUID(),
  keys: crypto.randomUUID(),
  pending: crypto.randomUUID(),
  place: crypto.randomUUID(),
  title: crypto.randomUUID(),
};

const caller = () =>
  appRouter.createCaller({
    auth: {} as never,
    db,
    headers: new Headers(),
    photoStorage: {
      delete: () => Promise.resolve(),
      read: () => Promise.resolve(null),
      save: () => Promise.resolve(""),
    },
    session: {
      session: {
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        id: "search-session",
        token: "search-token",
        updatedAt: new Date(),
        userId: posterId,
      },
      user: {
        createdAt: new Date(),
        email: posterEmail,
        emailVerified: true,
        id: posterId,
        name: "Search Tester",
        role: "student",
        updatedAt: new Date(),
      },
    } as never,
  });

describe("found item search and details", () => {
  beforeEach(async () => {
    await db.insert(user).values({
      email: posterEmail,
      emailVerified: true,
      id: posterId,
      name: "Search Tester",
    });

    await db.insert(item).values([
      {
        category: "Electronics",
        description: "A small blue case",
        foundAt: "2026-11-03",
        id: itemIds.title,
        placeFound: "North hallway",
        postedBy: posterId,
        title: "Wireless earbuds",
      },
      {
        category: "Keys",
        description: "Black EARbuds case with a sticker",
        foundAt: "2026-11-03",
        id: itemIds.description,
        placeFound: "Library",
        postedBy: posterId,
        title: "Key ring",
      },
      {
        category: "Electronics",
        description: "Blue notebook",
        foundAt: "2026-11-03",
        id: itemIds.place,
        placeFound: "Earbuds lab",
        postedBy: posterId,
        title: "Notebook",
      },
      {
        category: "Electronics",
        description: "A pending earbuds claim",
        foundAt: "2026-11-03",
        id: itemIds.pending,
        placeFound: "Auditorium",
        postedBy: posterId,
        status: "PendingClaim",
        title: "Earbuds in case",
      },
      {
        category: "Electronics",
        description: "Claimed property",
        foundAt: "2026-11-03",
        id: itemIds.claimed,
        placeFound: "Lobby",
        postedBy: posterId,
        status: "Claimed",
        title: "Earbuds claimed",
      },
      {
        category: "Keys",
        description: "No matching keyword",
        foundAt: "2026-11-03",
        id: itemIds.keys,
        placeFound: "Cafeteria",
        postedBy: posterId,
        title: "Keychain",
      },
    ]);

    await db.insert(itemPhoto).values([
      {
        itemId: itemIds.title,
        position: 1,
        storageKey: "second-photo.jpg",
      },
      {
        itemId: itemIds.title,
        position: 0,
        storageKey: "first-photo.jpg",
      },
    ]);
  });

  it("matches title, description, and place with a case-insensitive substring", async () => {
    const results = await caller().items.search({ keyword: "eArBuDs" });
    const resultIds = results.map(({ id }) => id);

    expect(resultIds).toEqual(
      expect.arrayContaining([
        itemIds.title,
        itemIds.description,
        itemIds.place,
        itemIds.pending,
      ])
    );
    expect(resultIds).not.toContain(itemIds.claimed);
    expect(resultIds).not.toContain(itemIds.keys);
  });

  it("filters by category and excludes claimed items when category is omitted", async () => {
    const all = await caller().items.search();
    const electronics = await caller().items.search({
      category: "Electronics",
    });

    expect(all.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        itemIds.title,
        itemIds.description,
        itemIds.place,
        itemIds.pending,
        itemIds.keys,
      ])
    );
    expect(all.map(({ id }) => id)).not.toContain(itemIds.claimed);
    expect(electronics.map(({ id }) => id)).toEqual(
      expect.arrayContaining([itemIds.title, itemIds.place, itemIds.pending])
    );
    expect(electronics.map(({ id }) => id)).not.toContain(itemIds.description);
    expect(electronics.map(({ id }) => id)).not.toContain(itemIds.keys);
    expect(electronics.map(({ id }) => id)).not.toContain(itemIds.claimed);
  });

  it("returns item details and ordered photos without exposing the poster email", async () => {
    const detail = await caller().items.byId({ id: itemIds.title });

    expect(detail).toMatchObject({
      category: "Electronics",
      description: "A small blue case",
      foundAt: "2026-11-03",
      id: itemIds.title,
      placeFound: "North hallway",
      status: "Active",
      title: "Wireless earbuds",
    });
    expect(detail.photos.map(({ position }) => position)).toEqual([0, 1]);
    expect(JSON.stringify(detail)).not.toContain(posterEmail);
    expect(detail).not.toHaveProperty("posterEmail");
  });
});
