export type PhotoContentType = "image/jpeg" | "image/png" | "image/webp";

export interface StoredPhoto {
  bytes: Uint8Array;
  contentType: PhotoContentType;
}

export interface PhotoStorage {
  delete: (storageKey: string) => Promise<void>;
  read: (storageKey: string) => Promise<StoredPhoto | null>;
  save: (photo: StoredPhoto) => Promise<string>;
}
