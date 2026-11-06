import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const { router } = t;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      cause: "No session",
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const verifiedProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.session.user.emailVerified) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Email verification required",
    });
  }
  return next({ ctx });
});

export const campusMemberProcedure = verifiedProcedure.use(({ ctx, next }) => {
  const { role } = ctx.session.user;
  if (role !== "student" && role !== "staff") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Student or staff access required",
    });
  }
  return next({ ctx });
});

export const systemAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "system_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "System administrator access required",
    });
  }
  return next({ ctx });
});
