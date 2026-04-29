import { z } from 'zod'

export const DismissParamsSchema = z.object({
  id: z.string().min(1),
})

export type DismissParams = z.infer<typeof DismissParamsSchema>
