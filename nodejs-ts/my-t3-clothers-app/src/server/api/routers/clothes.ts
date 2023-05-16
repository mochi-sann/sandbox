import { createTRPCRouter, publicProcedure } from "../trpc";
import z from "zod";

export const ClothesRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.clothers.findMany();
  }),
  new: publicProcedure
    .input(
      z.object({
        name: z.string(),
        price: z.number(),
      })
    )
    .mutation((opts) => {
      const data = opts.input;
      const prismaData = opts.ctx.prisma.clothers.create({
        data: {
          price: data.price,
          name: data.name,
        },
      });
      return prismaData;
    }),
});
