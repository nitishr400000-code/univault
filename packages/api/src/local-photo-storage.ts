import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  PhotoContentType,
  PhotoStorage,
  StoredPhoto,
} from "./photo-storage";

const extensions: Record<PhotoContentType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const contentTypes: Record<string, PhotoContentType> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error;

export class LocalPhotoStorage implements PhotoStorage {
  readonly #rootDirectory: string;

  constructor(rootDirectory: string) {
    this.#rootDirectory = path.resolve(rootDirectory);
  }

  async save(photo: StoredPhoto): Promise<string> {
    const storageKey = `${randomUUID()}${extensions[photo.contentType]}`;
    await mkdir(this.#rootDirectory, { recursive: true });
    await writeFile(path.join(this.#rootDirectory, storageKey), photo.bytes, {
      flag: "wx",
    });
    return storageKey;
  }

  async read(storageKey: string): Promise<StoredPhoto | null> {
    const filePath = this.#resolveKey(storageKey);
    if (!filePath) {
      return null;
    }
    const contentType = contentTypes[path.extname(storageKey)];
    if (!contentType) {
      return null;
    }

    try {
      return { bytes: await readFile(filePath), contentType };
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async delete(storageKey: string): Promise<void> {
    const filePath = this.#resolveKey(storageKey);
    if (!filePath) {
      return;
    }
    try {
      await unlink(filePath);
    } catch (error) {
      if (!(isNodeError(error) && error.code === "ENOENT")) {
        throw error;
      }
    }
  }

  #resolveKey(storageKey: string): string | null {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/u.test(
        storageKey
      )
    ) {
      return null;
    }
    const filePath = path.resolve(this.#rootDirectory, storageKey);
    return path.dirname(filePath) === this.#rootDirectory ? filePath : null;
  }
}
