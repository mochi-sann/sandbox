import { z } from "zod";

export const ZodFileType = z.custom<File>((v) => v instanceof File, {
  message: "Image is required",
});
