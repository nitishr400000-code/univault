import type { Context as ApiContext } from "@univault/api/context";
import type { Context as HonoContext } from "hono";

import { db, auth } from "./services";

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
    auth,
    db,
    headers: context.req.raw.headers,
    session,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
