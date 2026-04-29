import { ListFunctionsCommand, GetFunctionConfigurationCommand } from '@aws-sdk/client-lambda'
import { GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch'
import type { SQSEvent } from 'aws-lambda'

import { createFinding, type CheckType } from '../../domain/finding.js'
import { lambdaMonthlySavingsFromDownsize } from '../../domain/pricing.js'
import { upsertFinding } from '../../infra/findings-repo.js'
import { metrics, MetricUnit } from '../../infra/metrics.js'
import { logger } from '../../shared/logger.js'
import { lambdaClient, cloudWatchClient } from '../../shared/aws-clients.js'
import type { AwsRegion } from '../../domain/pricing.js'

const CHECK_TYPE: CheckType = 'lambda-overprovisioned'
const MAX_MEMORY_USED_RATIO = 0.5
const DAYS_LOOKBACK = 14
const TTL_DAYS = Number(process.env['FINDINGS_TTL_DAYS'] ?? '90')

export const handler = async (_event: SQSEvent): Promise<void> => {
  const accountId = process.env['AWS_ACCOUNT_ID'] ?? 'unknown'
  const region = (process.env['AWS_REGION'] ?? 'us-east-1') as AwsRegion

  const listResp = await lambdaClient.send(new ListFunctionsCommand({ MaxItems: 50 }))
  const functions = listResp.Functions ?? []

  const end = new Date()
  const start = new Date(end.getTime() - DAYS_LOOKBACK * 86400 * 1000)
  let findingsCount = 0

  for (const fn of functions) {
    const name = fn.FunctionName
    if (!name) continue

    const [maxMemResp, invocationsResp, durationResp] = await Promise.all([
      cloudWatchClient.send(new GetMetricStatisticsCommand({
        Namespace: 'AWS/Lambda',
        MetricName: 'MaxMemoryUsed',
        Dimensions: [{ Name: 'FunctionName', Value: name }],
        StartTime: start, EndTime: end,
        Period: DAYS_LOOKBACK * 86400,
        Statistics: ['Maximum'],
      })),
      cloudWatchClient.send(new GetMetricStatisticsCommand({
        Namespace: 'AWS/Lambda',
        MetricName: 'Invocations',
        Dimensions: [{ Name: 'FunctionName', Value: name }],
        StartTime: start, EndTime: end,
        Period: DAYS_LOOKBACK * 86400,
        Statistics: ['Sum'],
      })),
      cloudWatchClient.send(new GetMetricStatisticsCommand({
        Namespace: 'AWS/Lambda',
        MetricName: 'Duration',
        Dimensions: [{ Name: 'FunctionName', Value: name }],
        StartTime: start, EndTime: end,
        Period: DAYS_LOOKBACK * 86400,
        Statistics: ['Average'],
      })),
    ])

    const maxMemUsedMb = maxMemResp.Datapoints?.[0]?.Maximum ?? 0
    const configuredMb = fn.MemorySize ?? 128
    const invocations = invocationsResp.Datapoints?.[0]?.Sum ?? 0
    const avgDurationMs = durationResp.Datapoints?.[0]?.Average ?? 0

    if (maxMemUsedMb === 0 || invocations === 0) continue
    if (maxMemUsedMb / configuredMb >= MAX_MEMORY_USED_RATIO) continue

    const recommendedMb = Math.max(128, Math.ceil(maxMemUsedMb * 1.25 / 64) * 64)
    const monthlySavingsUsd = lambdaMonthlySavingsFromDownsize(
      configuredMb,
      recommendedMb,
      invocations,
      avgDurationMs,
    )

    if (monthlySavingsUsd < 0.01) continue

    const finding = createFinding({
      accountId,
      region,
      checkType: CHECK_TYPE,
      resourceId: name,
      resourceArn: fn.FunctionArn,
      title: `Over-provisioned Lambda: ${name}`,
      description: `${name} uses max ${maxMemUsedMb.toFixed(0)} MB but is configured with ${configuredMb} MB. Recommend reducing to ${recommendedMb} MB.`,
      monthlySavingsUsd,
      metadata: { configuredMb, maxMemUsedMb, recommendedMb, invocations, avgDurationMs },
      ttlDays: TTL_DAYS,
    })

    await upsertFinding(finding)
    findingsCount++
  }

  metrics.addMetric('FindingsDetected', MetricUnit.Count, findingsCount)
  metrics.addDimensions({ CheckType: CHECK_TYPE })
  metrics.publishStoredMetrics()
  logger.info('lambda-overprovisioned check complete', { functions: functions.length, findings: findingsCount })
}
