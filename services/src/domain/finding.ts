export type CheckType =
  | 'ec2-idle'
  | 'ebs-orphan'
  | 'eip-unassoc'
  | 'rds-underutilized'
  | 'snapshots-old'
  | 'nat-gw-low-traffic'
  | 'lambda-overprovisioned'

export type FindingStatus = 'active' | 'dismissed'

export interface Finding {
  readonly pk: string
  readonly sk: string
  readonly gsi1pk: string
  readonly gsi1sk: string
  readonly accountId: string
  readonly region: string
  readonly checkType: CheckType
  readonly resourceId: string
  readonly resourceArn?: string
  readonly title: string
  readonly description: string
  readonly monthlySavingsUsd: number
  readonly severity: 'low' | 'medium' | 'high'
  readonly status: FindingStatus
  readonly metadata: Record<string, unknown>
  readonly detectedAt: string
  readonly updatedAt: string
  readonly ttl?: number
}

export interface CreateFindingInput {
  accountId: string
  region: string
  checkType: CheckType
  resourceId: string
  resourceArn?: string
  title: string
  description: string
  monthlySavingsUsd: number
  metadata?: Record<string, unknown>
  ttlDays?: number
}

export function buildFindingKeys(
  accountId: string,
  region: string,
  checkType: CheckType,
  resourceId: string,
): { pk: string; sk: string } {
  return {
    pk: `ACCOUNT#${accountId}`,
    sk: `FINDING#${region}#${checkType}#${resourceId}`,
  }
}

function buildGsi1Keys(
  status: FindingStatus,
  monthlySavingsUsd: number,
): { gsi1pk: string; gsi1sk: string } {
  const cents = Math.round(monthlySavingsUsd * 100)
  const padded = String(cents).padStart(12, '0')
  return {
    gsi1pk: `STATUS#${status}`,
    gsi1sk: `SAVINGS#${padded}`,
  }
}

export function createFinding(input: CreateFindingInput): Finding {
  const { accountId, region, checkType, resourceId } = input
  const { pk, sk } = buildFindingKeys(accountId, region, checkType, resourceId)
  const status: FindingStatus = 'active'
  const { gsi1pk, gsi1sk } = buildGsi1Keys(status, input.monthlySavingsUsd)
  const now = new Date().toISOString()

  const ttl = input.ttlDays !== undefined
    ? Math.floor(Date.now() / 1000) + input.ttlDays * 86400
    : undefined

  return {
    pk,
    sk,
    gsi1pk,
    gsi1sk,
    accountId,
    region,
    checkType,
    resourceId,
    resourceArn: input.resourceArn,
    title: input.title,
    description: input.description,
    monthlySavingsUsd: input.monthlySavingsUsd,
    severity: computeSeverity(input.monthlySavingsUsd),
    status,
    metadata: input.metadata ?? {},
    detectedAt: now,
    updatedAt: now,
    ttl,
  }
}

export function dismissFinding(finding: Finding): Finding {
  const { gsi1pk, gsi1sk } = {
    gsi1pk: `STATUS#dismissed`,
    gsi1sk: finding.gsi1sk,
  }
  return { ...finding, status: 'dismissed', gsi1pk, gsi1sk, updatedAt: new Date().toISOString() }
}

function computeSeverity(monthlySavingsUsd: number): 'low' | 'medium' | 'high' {
  if (monthlySavingsUsd >= 100) return 'high'
  if (monthlySavingsUsd >= 20) return 'medium'
  return 'low'
}
