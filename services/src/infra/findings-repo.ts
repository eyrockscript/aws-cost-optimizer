import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'

import type { Finding } from '../domain/finding.js'
import { ddbDocClient } from '../shared/aws-clients.js'

const TABLE = process.env['FINDINGS_TABLE'] ?? ''

export async function upsertFinding(finding: Finding): Promise<void> {
  await ddbDocClient.send(new PutCommand({ TableName: TABLE, Item: finding }))
}

export async function getFinding(pk: string, sk: string): Promise<Finding | undefined> {
  const result = await ddbDocClient.send(
    new GetCommand({ TableName: TABLE, Key: { pk, sk } }),
  )
  return result.Item as Finding | undefined
}

export async function listActiveFindings(
  limit = 100,
  exclusiveStartKey?: Record<string, unknown>,
): Promise<{ items: Finding[]; lastKey?: Record<string, unknown> }> {
  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': 'STATUS#active' },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    }),
  )
  return {
    items: (result.Items ?? []) as Finding[],
    lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
  }
}

export async function dismissFindingById(pk: string, sk: string): Promise<void> {
  const now = new Date().toISOString()
  await ddbDocClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { pk, sk },
      UpdateExpression: 'SET #status = :dismissed, gsi1pk = :gsi1pk, updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':dismissed': 'dismissed',
        ':gsi1pk': 'STATUS#dismissed',
        ':now': now,
      },
    }),
  )
}

export interface SummaryResult {
  totalActive: number
  totalMonthlySavingsUsd: number
  byCheckType: Record<string, { count: number; savingsUsd: number }>
  bySeverity: { high: number; medium: number; low: number }
}

export async function getSummary(): Promise<SummaryResult> {
  const { items } = await listActiveFindings(1000)

  const byCheckType: Record<string, { count: number; savingsUsd: number }> = {}
  const bySeverity = { high: 0, medium: 0, low: 0 }
  let totalSavings = 0

  for (const finding of items) {
    const entry = byCheckType[finding.checkType] ?? { count: 0, savingsUsd: 0 }
    entry.count++
    entry.savingsUsd += finding.monthlySavingsUsd
    byCheckType[finding.checkType] = entry

    bySeverity[finding.severity]++
    totalSavings += finding.monthlySavingsUsd
  }

  return {
    totalActive: items.length,
    totalMonthlySavingsUsd: Math.round(totalSavings * 100) / 100,
    byCheckType,
    bySeverity,
  }
}
