import { DescribeNatGatewaysCommand } from '@aws-sdk/client-ec2'
import { GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch'
import type { SQSEvent } from 'aws-lambda'

import { createFinding, type CheckType } from '../../domain/finding.js'
import { natGwMonthlyCost } from '../../domain/pricing.js'
import { upsertFinding } from '../../infra/findings-repo.js'
import { metrics, MetricUnit } from '../../infra/metrics.js'
import { logger } from '../../shared/logger.js'
import { ec2Client, cloudWatchClient } from '../../shared/aws-clients.js'
import type { AwsRegion } from '../../domain/pricing.js'

const CHECK_TYPE: CheckType = 'nat-gw-low-traffic'
const BYTES_THRESHOLD = 1024 * 1024 * 100
const DAYS_LOOKBACK = 14
const TTL_DAYS = Number(process.env['FINDINGS_TTL_DAYS'] ?? '90')

export const handler = async (_event: SQSEvent): Promise<void> => {
  const accountId = process.env['AWS_ACCOUNT_ID'] ?? 'unknown'
  const region = (process.env['AWS_REGION'] ?? 'us-east-1') as AwsRegion

  const response = await ec2Client.send(
    new DescribeNatGatewaysCommand({ Filter: [{ Name: 'state', Values: ['available'] }] }),
  )

  const gateways = response.NatGateways ?? []
  const end = new Date()
  const start = new Date(end.getTime() - DAYS_LOOKBACK * 86400 * 1000)
  let findingsCount = 0

  for (const gw of gateways) {
    const natId = gw.NatGatewayId
    if (!natId) continue

    const trafficResp = await cloudWatchClient.send(
      new GetMetricStatisticsCommand({
        Namespace: 'AWS/NATGateway',
        MetricName: 'BytesOutToDestination',
        Dimensions: [{ Name: 'NatGatewayId', Value: natId }],
        StartTime: start, EndTime: end,
        Period: DAYS_LOOKBACK * 86400,
        Statistics: ['Sum'],
      }),
    )

    const totalBytes = trafficResp.Datapoints?.[0]?.Sum ?? 0
    if (totalBytes >= BYTES_THRESHOLD) continue

    const monthlySavingsUsd = natGwMonthlyCost()
    const mbTransferred = (totalBytes / (1024 * 1024)).toFixed(1)

    const finding = createFinding({
      accountId,
      region,
      checkType: CHECK_TYPE,
      resourceId: natId,
      title: `Low-traffic NAT Gateway: ${natId}`,
      description: `NAT Gateway ${natId} transferred only ${mbTransferred} MB over ${DAYS_LOOKBACK} days. Consider removing if unused.`,
      monthlySavingsUsd,
      metadata: { totalBytesTransferred: totalBytes, daysLookback: DAYS_LOOKBACK, vpcId: gw.VpcId },
      ttlDays: TTL_DAYS,
    })

    await upsertFinding(finding)
    findingsCount++
  }

  metrics.addMetric('FindingsDetected', MetricUnit.Count, findingsCount)
  metrics.addDimensions({ CheckType: CHECK_TYPE })
  metrics.publishStoredMetrics()
  logger.info('nat-gw-low-traffic check complete', { gateways: gateways.length, findings: findingsCount })
}
