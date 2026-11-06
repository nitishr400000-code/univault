import path from "node:path";

import { LocalPhotoStorage } from "@univault/api/local-photo-storage";
import { createAuth } from "@univault/auth";
import { createDb } from "@univault/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
export const photoStorage = new LocalPhotoStorage(
  path.join(process.cwd(), ".local", "photos")
);
