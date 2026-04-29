import { z } from 'zod'

export const SummaryResponseSchema = z.object({
  totalActive: z.number(),
  totalMonthlySavingsUsd: z.number(),
  byCheckType: z.record(z.object({ count: z.number(), savingsUsd: z.number() })),
  bySeverity: z.object({ high: z.number(), medium: z.number(), low: z.number() }),
})

export type SummaryResponse = z.infer<typeof SummaryResponseSchema>
