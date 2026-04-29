import { DescribeDBInstancesCommand } from '@aws-sdk/client-rds'
import { GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch'
import type { SQSEvent } from 'aws-lambda'

import { createFinding, type CheckType } from '../../domain/finding.js'
import { upsertFinding } from '../../infra/findings-repo.js'
import { metrics, MetricUnit } from '../../infra/metrics.js'
import { logger } from '../../shared/logger.js'
import { rdsClient, cloudWatchClient } from '../../shared/aws-clients.js'
import type { AwsRegion } from '../../domain/pricing.js'

const CHECK_TYPE: CheckType = 'rds-underutilized'
const CPU_THRESHOLD_PCT = 5
const CONN_THRESHOLD = 5
const DAYS_LOOKBACK = 14
const TTL_DAYS = Number(process.env['FINDINGS_TTL_DAYS'] ?? '90')

const RDS_HOURLY_PRICE: Record<string, number> = {
  'db.t3.micro': 0.017,
  'db.t3.small': 0.034,
  'db.t3.medium': 0.068,
  'db.m5.large': 0.171,
  'db.m5.xlarge': 0.342,
}

export const handler = async (_event: SQSEvent): Promise<void> => {
  const accountId = process.env['AWS_ACCOUNT_ID'] ?? 'unknown'
  const region = (process.env['AWS_REGION'] ?? 'us-east-1') as AwsRegion

  const response = await rdsClient.send(new DescribeDBInstancesCommand({}))
  const instances = (response.DBInstances ?? []).filter(db => db.DBInstanceStatus === 'available')

  const end = new Date()
  const start = new Date(end.getTime() - DAYS_LOOKBACK * 86400 * 1000)
  let findingsCount = 0

  for (const db of instances) {
    const dbId = db.DBInstanceIdentifier
    const instanceClass = db.DBInstanceClass ?? 'db.t3.micro'
    if (!dbId) continue

    const [cpuResp, connResp] = await Promise.all([
      cloudWatchClient.send(new GetMetricStatisticsCommand({
        Namespace: 'AWS/RDS',
        MetricName: 'CPUUtilization',
        Dimensions: [{ Name: 'DBInstanceIdentifier', Value: dbId }],
        StartTime: start, EndTime: end,
        Period: DAYS_LOOKBACK * 86400,
        Statistics: ['Average'],
      })),
      cloudWatchClient.send(new GetMetricStatisticsCommand({
        Namespace: 'AWS/RDS',
        MetricName: 'DatabaseConnections',
        Dimensions: [{ Name: 'DBInstanceIdentifier', Value: dbId }],
        StartTime: start, EndTime: end,
        Period: DAYS_LOOKBACK * 86400,
        Statistics: ['Maximum'],
      })),
    ])

    const avgCpu = cpuResp.Datapoints?.[0]?.Average ?? 0
    const maxConn = connResp.Datapoints?.[0]?.Maximum ?? 0

    if (avgCpu > CPU_THRESHOLD_PCT || maxConn > CONN_THRESHOLD) continue

    const hourlyRate = RDS_HOURLY_PRICE[instanceClass] ?? 0.05
    const monthlySavingsUsd = hourlyRate * 730

    const finding = createFinding({
      accountId,
      region,
      checkType: CHECK_TYPE,
      resourceId: dbId,
      title: `Underutilized RDS instance: ${dbId}`,
      description: `${dbId} (${instanceClass}) averaged ${avgCpu.toFixed(1)}% CPU and ${maxConn} max connections over ${DAYS_LOOKBACK} days.`,
      monthlySavingsUsd,
      metadata: { instanceClass, avgCpuPct: avgCpu, maxConnections: maxConn, engine: db.Engine },
      ttlDays: TTL_DAYS,
    })

    await upsertFinding(finding)
    findingsCount++
  }

  metrics.addMetric('FindingsDetected', MetricUnit.Count, findingsCount)
  metrics.addDimensions({ CheckType: CHECK_TYPE })
  metrics.publishStoredMetrics()
  logger.info('rds-underutilized check complete', { instances: instances.length, findings: findingsCount })
}
