import { createTRPCRouter } from "@/server/api/trpc";
import { exampleRouter } from "@/server/api/routers/example";
import { ClothesRouter } from "./routers/clothes";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  clothes: ClothesRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
