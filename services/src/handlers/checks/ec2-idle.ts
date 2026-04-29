import { DescribeInstancesCommand, DescribeInstanceStatusCommand } from '@aws-sdk/client-ec2'
import { GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch'
import type { SQSEvent } from 'aws-lambda'

import { createFinding, type CheckType } from '../../domain/finding.js'
import { ec2MonthlyCost, type AwsRegion } from '../../domain/pricing.js'
import { upsertFinding } from '../../infra/findings-repo.js'
import { metrics, MetricUnit } from '../../infra/metrics.js'
import { logger } from '../../shared/logger.js'
import { ec2Client, cloudWatchClient } from '../../shared/aws-clients.js'

const CHECK_TYPE: CheckType = 'ec2-idle'
const CPU_THRESHOLD_PCT = 5
const DAYS_LOOKBACK = 14
const TABLE = process.env['FINDINGS_TABLE'] ?? ''
const TTL_DAYS = Number(process.env['FINDINGS_TTL_DAYS'] ?? '90')

export const handler = async (event: SQSEvent): Promise<void> => {
  const accountId = process.env['AWS_ACCOUNT_ID'] ?? 'unknown'
  const region = (process.env['AWS_REGION'] ?? 'us-east-1') as AwsRegion

  const instancesResp = await ec2Client.send(
    new DescribeInstancesCommand({ Filters: [{ Name: 'instance-state-name', Values: ['running'] }] }),
  )

  const instances = instancesResp.Reservations?.flatMap(r => r.Instances ?? []) ?? []
  const end = new Date()
  const start = new Date(end.getTime() - DAYS_LOOKBACK * 86400 * 1000)

  let findingsCount = 0

  for (const instance of instances) {
    const instanceId = instance.InstanceId
    const instanceType = instance.InstanceType ?? 't3.medium'
    if (!instanceId) continue

    const cpuResp = await cloudWatchClient.send(
      new GetMetricStatisticsCommand({
        Namespace: 'AWS/EC2',
        MetricName: 'CPUUtilization',
        Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
        StartTime: start,
        EndTime: end,
        Period: DAYS_LOOKBACK * 86400,
        Statistics: ['Average'],
      }),
    )

    const avgCpu = cpuResp.Datapoints?.[0]?.Average ?? 0
    if (avgCpu > CPU_THRESHOLD_PCT) continue

    const monthlySavingsUsd = ec2MonthlyCost(instanceType, region)
    const name = instance.Tags?.find(t => t.Key === 'Name')?.Value ?? instanceId

    const finding = createFinding({
      accountId,
      region,
      checkType: CHECK_TYPE,
      resourceId: instanceId,
      title: `Idle EC2 instance: ${name}`,
      description: `Instance ${instanceId} (${instanceType}) averaged ${avgCpu.toFixed(1)}% CPU over ${DAYS_LOOKBACK} days.`,
      monthlySavingsUsd,
      metadata: { instanceType, avgCpuPct: avgCpu, daysLookback: DAYS_LOOKBACK },
      ttlDays: TTL_DAYS,
    })

    await upsertFinding(finding)
    findingsCount++
  }

  metrics.addMetric('FindingsDetected', MetricUnit.Count, findingsCount)
  metrics.addDimensions({ CheckType: CHECK_TYPE })
  metrics.publishStoredMetrics()
  logger.info('ec2-idle check complete', { instances: instances.length, findings: findingsCount })
}
