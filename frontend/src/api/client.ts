const API_BASE = import.meta.env.VITE_API_URL ?? ''
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

export interface Finding {
  pk: string
  sk: string
  accountId: string
  region: string
  checkType: string
  resourceId: string
  resourceArn?: string
  title: string
  description: string
  monthlySavingsUsd: number
  severity: 'low' | 'medium' | 'high'
  status: 'active' | 'dismissed'
  metadata: Record<string, unknown>
  detectedAt: string
  updatedAt: string
}

export interface ListFindingsResponse {
  items: Finding[]
  nextToken?: string
}

export interface SummaryResponse {
  totalActive: number
  totalMonthlySavingsUsd: number
  byCheckType: Record<string, { count: number; savingsUsd: number }>
  bySeverity: { high: number; medium: number; low: number }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`API ${resp.status}: ${text}`)
  }
  return resp.json() as Promise<T>
}

export function fetchFindings(limit = 50, nextToken?: string): Promise<ListFindingsResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (nextToken) params.set('nextToken', nextToken)
  return apiFetch<ListFindingsResponse>(`/findings?${params.toString()}`)
}

export function fetchSummary(): Promise<SummaryResponse> {
  return apiFetch<SummaryResponse>('/summary')
}

export function dismissFinding(finding: Finding): Promise<void> {
  const id = encodeURIComponent(`${finding.pk}#${finding.sk}`.replace('ACCOUNT#', '').replace('FINDING#', ''))
  return apiFetch<void>(`/findings/${id}/dismiss`, { method: 'POST' })
}
