import {
  protectedProcedure,
  publicProcedure,
  router,
  systemAdminProcedure,
} from "../index";
import { itemsRouter } from "./items";

export const appRouter = router({
  admin: router({
    listUsers: systemAdminProcedure.query(({ ctx }) =>
      ctx.db.query.user.findMany()
    ),
  }),
  healthCheck: publicProcedure.query(() => "OK"),
  items: itemsRouter,
  privateData: protectedProcedure.query(({ ctx }) => ({
    message: "This is private",
    user: ctx.session.user,
  })),
});
export type AppRouter = typeof appRouter;
