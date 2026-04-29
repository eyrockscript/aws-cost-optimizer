import { z } from 'zod'

export const ListFindingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  nextToken: z.string().optional(),
})

export type ListFindingsQuery = z.infer<typeof ListFindingsQuerySchema>
