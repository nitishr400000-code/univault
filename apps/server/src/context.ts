import type { Context as ApiContext } from "@univault/api/context";
import type { Context as HonoContext } from "hono";

import { auth, db, photoStorage } from "./services";

export interface CreateContextOptions {
  context: HonoContext;
}

export const createContext = async ({
  context,
}: CreateContextOptions): Promise<ApiContext> => {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    db,
    photoStorage,
    session,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
