import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  protectedProcedure,
  publicProcedure,
  router,
  systemAdminProcedure,
} from "../index";

export const appRouter = router({
  admin: router({
    deactivateUser: systemAdminProcedure
      .input(z.object({ userId: z.string().min(1) }))
      .mutation(({ ctx, input }) =>
        ctx.auth.api.banUser({
          body: { userId: input.userId },
          headers: ctx.headers,
        })
      ),
    grantStaff: systemAdminProcedure
      .input(z.object({ userId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const target = await ctx.db.query.user.findFirst({
          columns: { role: true },
          where: { id: input.userId },
        });
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        if (target.role === "system_admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "System admin role cannot be changed here",
          });
        }
        return ctx.auth.api.setRole({
          body: { role: "staff", userId: input.userId },
          headers: ctx.headers,
        });
      }),
    listUsers: systemAdminProcedure
      .input(
        z
          .object({ search: z.string().trim().min(1).max(100).optional() })
          .optional()
      )
      .query(({ ctx, input }) => {
        const search = input?.search?.replaceAll(/[\\%_]/gu, "\\$&");
        const pattern = search ? `%${search}%` : undefined;
        return ctx.db.query.user.findMany({
          columns: {
            banned: true,
            email: true,
            id: true,
            name: true,
            role: true,
          },
          limit: 100,
          orderBy: { name: "asc" },
          where: pattern
            ? {
                OR: [
                  { name: { ilike: pattern } },
                  { email: { ilike: pattern } },
                ],
              }
            : undefined,
        });
      }),
    reactivateUser: systemAdminProcedure
      .input(z.object({ userId: z.string().min(1) }))
      .mutation(({ ctx, input }) =>
        ctx.auth.api.unbanUser({
          body: { userId: input.userId },
          headers: ctx.headers,
        })
      ),
    removeStaff: systemAdminProcedure
      .input(z.object({ userId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const target = await ctx.db.query.user.findFirst({
          columns: { role: true },
          where: { id: input.userId },
        });
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        if (target.role === "system_admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "System admin role cannot be changed here",
          });
        }
        return ctx.auth.api.setRole({
          body: { role: "student", userId: input.userId },
          headers: ctx.headers,
        });
      }),
  }),
  healthCheck: publicProcedure.query(() => "OK"),
  privateData: protectedProcedure.query(({ ctx }) => ({
    message: "This is private",
    user: ctx.session.user,
  })),
});
export type AppRouter = typeof appRouter;
