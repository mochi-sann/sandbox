import { z } from "zod"

export const CreateProjectSchema = z.object({
  // template: __fieldName__: z.__zodType__(),
})
export const UpdateProjectSchema = z.object({
  id: z.number(),
  // template: __fieldName__: z.__zodType__(),
})

export const DeleteProjectSchema = z.object({
  id: z.number(),
})
