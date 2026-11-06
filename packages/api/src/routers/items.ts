import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { item, itemPhoto } from "@univault/db/schema/items";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router, verifiedProcedure } from "../index";
import type { PhotoContentType, StoredPhoto } from "../photo-storage";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_BASE64_LENGTH = Math.ceil(MAX_PHOTO_BYTES / 3) * 4;

const categories = [
  "Electronics",
  "ID/Card",
  "Keys",
  "Stationery",
  "Personal Gear",
  "Other",
] as const;

const categorySchema = z.enum(categories);

const searchInput = z
  .object({
    category: categorySchema.optional(),
    keyword: z.string().trim().min(1).max(100).optional(),
  })
  .optional();

const photoInput = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  dataBase64: z.string().min(1),
});

const createInput = z.object({
  category: z.enum(categories),
  description: z.string().trim().min(1),
  foundAt: z.iso.date(),
  photos: z.array(photoInput).min(1).max(5),
  placeFound: z.string().trim().min(1),
  title: z.string().trim().min(1),
});

const invalidPhoto = () =>
  new TRPCError({
    code: "BAD_REQUEST",
    message:
      "Photo content must be a JPEG, PNG, or WebP image no larger than 5 MB.",
  });

const detectContentType = (bytes: Uint8Array): PhotoContentType | null => {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" &&
    Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
};

const decodePhoto = (input: z.infer<typeof photoInput>): StoredPhoto => {
  const { dataBase64 } = input;
  const paddingIndex = dataBase64.indexOf("=");
  if (
    dataBase64.length > MAX_PHOTO_BASE64_LENGTH ||
    dataBase64.length % 4 !== 0 ||
    /[^A-Za-z0-9+/=]/u.test(dataBase64) ||
    (paddingIndex !== -1 && paddingIndex < dataBase64.length - 2)
  ) {
    throw invalidPhoto();
  }
  const bytes = Buffer.from(dataBase64, "base64");
  if (
    bytes.length === 0 ||
    bytes.length > MAX_PHOTO_BYTES ||
    bytes.toString("base64") !== dataBase64
  ) {
    throw invalidPhoto();
  }

  const detectedType = detectContentType(bytes);
  if (!detectedType || detectedType !== input.contentType) {
    throw invalidPhoto();
  }
  return { bytes, contentType: detectedType };
};

export const itemsRouter = router({
  byId: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [foundItem] = await ctx.db
        .select({
          category: item.category,
          description: item.description,
          foundAt: item.foundAt,
          id: item.id,
          placeFound: item.placeFound,
          status: item.status,
          title: item.title,
        })
        .from(item)
        .where(eq(item.id, input.id))
        .limit(1);

      if (!foundItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      const photos = await ctx.db
        .select({ id: itemPhoto.id, position: itemPhoto.position })
        .from(itemPhoto)
        .where(eq(itemPhoto.itemId, input.id))
        .orderBy(itemPhoto.position);

      return { ...foundItem, photos };
    }),

  create: verifiedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const { id: posterId, role } = ctx.session.user;
      if (role !== "student" && role !== "staff") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only students and staff can post found items.",
        });
      }

      const photos = input.photos.map(decodePhoto);
      const storageKeys: string[] = [];
      try {
        const savedPhotos = await Promise.allSettled(
          photos.map((photo) => ctx.photoStorage.save(photo))
        );
        for (const savedPhoto of savedPhotos) {
          if (savedPhoto.status === "fulfilled") {
            storageKeys.push(savedPhoto.value);
          }
        }
        const failedSave = savedPhotos.find(
          (savedPhoto) => savedPhoto.status === "rejected"
        );
        if (failedSave?.status === "rejected") {
          throw failedSave.reason;
        }
        const id = randomUUID();
        await ctx.db.transaction(async (tx) => {
          await tx.insert(item).values({
            category: input.category,
            description: input.description,
            foundAt: input.foundAt,
            id,
            placeFound: input.placeFound,
            postedBy: posterId,
            title: input.title,
          });
          await tx.insert(itemPhoto).values(
            storageKeys.map((storageKey, position) => ({
              itemId: id,
              position,
              storageKey,
            }))
          );
        });
        return { id };
      } catch (error) {
        await Promise.allSettled(
          storageKeys.map((storageKey) => ctx.photoStorage.delete(storageKey))
        );
        throw error;
      }
    }),

  photo: protectedProcedure
    .input(z.object({ photoId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [photo] = await ctx.db
        .select({ storageKey: itemPhoto.storageKey })
        .from(itemPhoto)
        .where(eq(itemPhoto.id, input.photoId))
        .limit(1);
      if (!photo) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const stored = await ctx.photoStorage.read(photo.storageKey);
      if (!stored) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return {
        contentType: stored.contentType,
        dataBase64: Buffer.from(stored.bytes).toString("base64"),
      };
    }),

  search: protectedProcedure.input(searchInput).query(({ ctx, input }) => {
    const filters = [inArray(item.status, ["Active", "PendingClaim"] as const)];
    if (input?.category) {
      filters.push(eq(item.category, input.category));
    }
    const keyword = input?.keyword?.replaceAll(/[\\%_]/gu, "\\$&");
    if (keyword) {
      const pattern = `%${keyword}%`;
      const matchKeyword = or(
        ilike(item.title, pattern),
        ilike(item.description, pattern),
        ilike(item.placeFound, pattern)
      );
      if (matchKeyword) {
        filters.push(matchKeyword);
      }
    }

    return ctx.db
      .select({
        category: item.category,
        description: item.description,
        foundAt: item.foundAt,
        id: item.id,
        placeFound: item.placeFound,
        status: item.status,
        title: item.title,
      })
      .from(item)
      .where(and(...filters))
      .orderBy(desc(item.createdAt), desc(item.id))
      .limit(100);
  }),
});
