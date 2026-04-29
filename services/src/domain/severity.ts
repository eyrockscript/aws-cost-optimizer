export type Severity = 'low' | 'medium' | 'high'

const HIGH_THRESHOLD_USD = 100
const MEDIUM_THRESHOLD_USD = 20

export function computeSeverity(monthlySavingsUsd: number): Severity {
  if (monthlySavingsUsd >= HIGH_THRESHOLD_USD) return 'high'
  if (monthlySavingsUsd >= MEDIUM_THRESHOLD_USD) return 'medium'
  return 'low'
}

export function severityWeight(severity: Severity): number {
  switch (severity) {
    case 'high': return 3
    case 'medium': return 2
    case 'low': return 1
  }
}
