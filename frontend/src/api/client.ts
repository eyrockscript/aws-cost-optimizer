const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const API_KEY = import.meta.env.VITE_API_KEY ?? ''
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !import.meta.env.VITE_API_URL

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

// ─── Mock data for local demo (no backend required) ───────────────────────────

const MOCK_FINDINGS: Finding[] = [
  {
    pk: 'ACCOUNT#123456789012', sk: 'FINDING#001', accountId: '123456789012',
    region: 'us-east-1', checkType: 'ec2-idle', resourceId: 'i-0abc123def456789a',
    resourceArn: 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123def456789a',
    title: 'EC2 instance i-0abc123def456789a has <2% CPU over 14 days',
    description: 'Instance m5.xlarge running with average CPU utilization below 2% for 14 consecutive days.',
    monthlySavingsUsd: 142.56, severity: 'high', status: 'active', metadata: {},
    detectedAt: '2026-04-15T10:00:00Z', updatedAt: '2026-04-15T10:00:00Z',
  },
  {
    pk: 'ACCOUNT#123456789012', sk: 'FINDING#002', accountId: '123456789012',
    region: 'us-west-2', checkType: 'rds-underutilized', resourceId: 'myapp-prod-db',
    title: 'RDS instance myapp-prod-db averaging 3% CPU',
    description: 'db.r5.large RDS instance with less than 5% average CPU and 200MB connections/day.',
    monthlySavingsUsd: 98.40, severity: 'high', status: 'active', metadata: {},
    detectedAt: '2026-04-16T08:30:00Z', updatedAt: '2026-04-16T08:30:00Z',
  },
  {
    pk: 'ACCOUNT#123456789012', sk: 'FINDING#003', accountId: '123456789012',
    region: 'us-east-1', checkType: 'ebs-orphan', resourceId: 'vol-0deadbeef1234567',
    title: 'EBS volume vol-0deadbeef1234567 unattached for 30+ days',
    description: '500 GiB gp3 volume not attached to any instance since March 2026.',
    monthlySavingsUsd: 40.00, severity: 'medium', status: 'active', metadata: {},
    detectedAt: '2026-04-17T12:00:00Z', updatedAt: '2026-04-17T12:00:00Z',
  },
  {
    pk: 'ACCOUNT#123456789012', sk: 'FINDING#004', accountId: '123456789012',
    region: 'eu-west-1', checkType: 'nat-gw-low-traffic', resourceId: 'nat-0f1e2d3c4b5a6789',
    title: 'NAT Gateway nat-0f1e2d3c4b5a6789 processing <1 GB/day',
    description: 'NAT Gateway in eu-west-1a averaging 0.3 GB/day over 7 days. Consider consolidating.',
    monthlySavingsUsd: 32.50, severity: 'medium', status: 'active', metadata: {},
    detectedAt: '2026-04-18T09:15:00Z', updatedAt: '2026-04-18T09:15:00Z',
  },
  {
    pk: 'ACCOUNT#123456789012', sk: 'FINDING#005', accountId: '123456789012',
    region: 'us-east-1', checkType: 'eip-unassoc', resourceId: '52.23.141.88',
    title: 'Elastic IP 52.23.141.88 not associated',
    description: 'Elastic IP allocated but not associated with any running instance or ENI.',
    monthlySavingsUsd: 3.60, severity: 'low', status: 'active', metadata: {},
    detectedAt: '2026-04-19T14:00:00Z', updatedAt: '2026-04-19T14:00:00Z',
  },
  {
    pk: 'ACCOUNT#123456789012', sk: 'FINDING#006', accountId: '123456789012',
    region: 'us-east-1', checkType: 'eip-unassoc', resourceId: '34.198.22.110',
    title: 'Elastic IP 34.198.22.110 not associated',
    description: 'Elastic IP allocated but not associated with any running instance or ENI.',
    monthlySavingsUsd: 3.60, severity: 'low', status: 'active', metadata: {},
    detectedAt: '2026-04-19T14:05:00Z', updatedAt: '2026-04-19T14:05:00Z',
  },
  {
    pk: 'ACCOUNT#123456789012', sk: 'FINDING#007', accountId: '123456789012',
    region: 'ap-southeast-1', checkType: 'snapshots-old', resourceId: 'snap-0a1b2c3d4e5f67890',
    title: 'EBS snapshot snap-0a1b2c3d4e5f67890 older than 90 days',
    description: '200 GiB snapshot created Jan 2026 with no recent access pattern.',
    monthlySavingsUsd: 10.00, severity: 'low', status: 'active', metadata: {},
    detectedAt: '2026-04-20T11:00:00Z', updatedAt: '2026-04-20T11:00:00Z',
  },
  {
    pk: 'ACCOUNT#123456789012', sk: 'FINDING#008', accountId: '123456789012',
    region: 'us-east-1', checkType: 'lambda-overprovisioned', resourceId: 'image-resizer-prod',
    title: 'Lambda image-resizer-prod using <15% of 1024 MB',
    description: 'Function averaging 148 MB max memory. Reducing to 256 MB saves cost without impacting performance.',
    monthlySavingsUsd: 18.20, severity: 'medium', status: 'active', metadata: {},
    detectedAt: '2026-04-21T07:45:00Z', updatedAt: '2026-04-21T07:45:00Z',
  },
  {
    pk: 'ACCOUNT#123456789012', sk: 'FINDING#009', accountId: '123456789012',
    region: 'us-west-2', checkType: 'ec2-idle', resourceId: 'i-0ffe987654321dcba',
    title: 'EC2 instance i-0ffe987654321dcba has <1% CPU over 14 days',
    description: 'Instance t3.large running with average CPU utilization below 1% for 14 consecutive days.',
    monthlySavingsUsd: 60.74, severity: 'high', status: 'active', metadata: {},
    detectedAt: '2026-04-22T16:20:00Z', updatedAt: '2026-04-22T16:20:00Z',
  },
  {
    pk: 'ACCOUNT#123456789012', sk: 'FINDING#010', accountId: '123456789012',
    region: 'eu-central-1', checkType: 'ebs-orphan', resourceId: 'vol-0cafe1234abcd5678',
    title: 'EBS volume vol-0cafe1234abcd5678 unattached for 45 days',
    description: '100 GiB gp2 volume not attached since Feb 2026. Consider snapshotting and deleting.',
    monthlySavingsUsd: 10.00, severity: 'low', status: 'active', metadata: {},
    detectedAt: '2026-04-23T13:30:00Z', updatedAt: '2026-04-23T13:30:00Z',
  },
]

function buildMockSummary(findings: Finding[]): SummaryResponse {
  const byCheckType: Record<string, { count: number; savingsUsd: number }> = {}
  const bySeverity = { high: 0, medium: 0, low: 0 }
  let total = 0
  for (const f of findings) {
    byCheckType[f.checkType] ??= { count: 0, savingsUsd: 0 }
    byCheckType[f.checkType].count++
    byCheckType[f.checkType].savingsUsd += f.monthlySavingsUsd
    bySeverity[f.severity]++
    total += f.monthlySavingsUsd
  }
  return {
    totalActive: findings.length,
    totalMonthlySavingsUsd: Math.round(total * 100) / 100,
    byCheckType,
    bySeverity,
  }
}

// ─── Live API ─────────────────────────────────────────────────────────────────

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

// ─── Public API (mock-aware) ──────────────────────────────────────────────────

let _mockFindings = [...MOCK_FINDINGS]

export function fetchFindings(limit = 50, nextToken?: string): Promise<ListFindingsResponse> {
  if (USE_MOCK) {
    const start = nextToken ? parseInt(nextToken) : 0
    return Promise.resolve({ items: _mockFindings.slice(start, start + limit) })
  }
  const params = new URLSearchParams({ limit: String(limit) })
  if (nextToken) params.set('nextToken', nextToken)
  return apiFetch<ListFindingsResponse>(`/findings?${params.toString()}`)
}

export function fetchSummary(): Promise<SummaryResponse> {
  if (USE_MOCK) return Promise.resolve(buildMockSummary(_mockFindings))
  return apiFetch<SummaryResponse>('/summary')
}

export function dismissFinding(finding: Finding): Promise<void> {
  if (USE_MOCK) {
    _mockFindings = _mockFindings.filter(f => f.sk !== finding.sk)
    return Promise.resolve()
  }
  const id = encodeURIComponent(`${finding.pk}#${finding.sk}`.replace('ACCOUNT#', '').replace('FINDING#', ''))
  return apiFetch<void>(`/findings/${id}/dismiss`, { method: 'POST' })
}
