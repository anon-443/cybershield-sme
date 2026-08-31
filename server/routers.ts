import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getScanComparisonForUser, getScanForUser, listScansForUser } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { executeScanForUser } from "./scanService";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  scans: router({
    run: protectedProcedure
      .input(z.object({ domain: z.string().min(1).max(253), includeAi: z.boolean().default(true), dkimSelector: z.string().max(63).optional() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await executeScanForUser(ctx.user.id, input);
        } catch (error) {
          const message = error instanceof Error ? error.message : "The assessment could not be completed.";
          throw new TRPCError({ code: "BAD_REQUEST", message });
        }
      }),
    list: protectedProcedure.query(({ ctx }) => listScansForUser(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.string().min(1).max(36) })).query(async ({ ctx, input }) => {
      const report = await getScanForUser(input.id, ctx.user.id);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "This scan was not found in your history." });
      return report;
    }),
    compare: protectedProcedure.input(z.object({ id: z.string().min(1).max(36) })).query(async ({ ctx, input }) => {
      const comparison = await getScanComparisonForUser(input.id, ctx.user.id);
      if (!comparison) throw new TRPCError({ code: "NOT_FOUND", message: "This scan was not found in your history." });
      return comparison;
    }),
  }),
});

export type AppRouter = typeof appRouter;
