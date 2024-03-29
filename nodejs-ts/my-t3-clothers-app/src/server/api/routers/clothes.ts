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
        image: z.custom<File>((v) => v instanceof File, {
          message: "Image is required",
        }).nullable(),
      })
    )
    .mutation((opts) => {
      const data = opts.input;

      const file = data.image;
      let buffer: Buffer | null = null;
      if (file != null) {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onloadend = () => {
          buffer = Buffer.from(reader.result as ArrayBuffer);
          // do something with the buffer
        };
      }


      const prismaData = opts.ctx.prisma.clothers.create({
        data: {
          price: data.price,
          name: data.name,
          img: buffer
        },
      });
      return prismaData;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation((opts) => {
      const data = opts.input;
      const prismaData = opts.ctx.prisma.clothers.delete({
        where: {
          id: data.id,
        },
      });
      return prismaData;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string(),
        price: z.number(),
      })
    )
    .mutation((opts) => {
      const data = opts.input;
      const prismaData = opts.ctx.prisma.clothers.update({
        where: {
          id: data.id,
        },
        data: {
          name: data.name,
          price: data.price,
        },
      });
      return prismaData;
    }),

  getId: publicProcedure.input(z.object({ id: z.number() })).query((opts) => {
    const data = opts.input;
    const prismaData = opts.ctx.prisma.clothers.findUnique({
      where: {
        id: data.id,
      },
    });
    return prismaData;
  }),
});
