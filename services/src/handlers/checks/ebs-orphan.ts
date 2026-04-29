import { DescribeVolumesCommand } from '@aws-sdk/client-ec2'
import type { SQSEvent } from 'aws-lambda'

import { createFinding, type CheckType } from '../../domain/finding.js'
import { ebsMonthlyCost } from '../../domain/pricing.js'
import { upsertFinding } from '../../infra/findings-repo.js'
import { metrics, MetricUnit } from '../../infra/metrics.js'
import { logger } from '../../shared/logger.js'
import { ec2Client } from '../../shared/aws-clients.js'
import type { AwsRegion } from '../../domain/pricing.js'

const CHECK_TYPE: CheckType = 'ebs-orphan'
const TTL_DAYS = Number(process.env['FINDINGS_TTL_DAYS'] ?? '90')

export const handler = async (_event: SQSEvent): Promise<void> => {
  const accountId = process.env['AWS_ACCOUNT_ID'] ?? 'unknown'
  const region = (process.env['AWS_REGION'] ?? 'us-east-1') as AwsRegion

  const response = await ec2Client.send(
    new DescribeVolumesCommand({ Filters: [{ Name: 'status', Values: ['available'] }] }),
  )

  const volumes = response.Volumes ?? []
  let findingsCount = 0

  for (const volume of volumes) {
    const volumeId = volume.VolumeId
    const sizeGb = volume.Size ?? 0
    if (!volumeId) continue

    const monthlySavingsUsd = ebsMonthlyCost(sizeGb)
    const finding = createFinding({
      accountId,
      region,
      checkType: CHECK_TYPE,
      resourceId: volumeId,
      title: `Unattached EBS volume: ${volumeId}`,
      description: `Volume ${volumeId} (${sizeGb} GiB, ${volume.VolumeType ?? 'gp3'}) is not attached to any instance.`,
      monthlySavingsUsd,
      metadata: { sizeGb, volumeType: volume.VolumeType, availabilityZone: volume.AvailabilityZone },
      ttlDays: TTL_DAYS,
    })

    await upsertFinding(finding)
    findingsCount++
  }

  metrics.addMetric('FindingsDetected', MetricUnit.Count, findingsCount)
  metrics.addDimensions({ CheckType: CHECK_TYPE })
  metrics.publishStoredMetrics()
  logger.info('ebs-orphan check complete', { volumes: volumes.length, findings: findingsCount })
}
