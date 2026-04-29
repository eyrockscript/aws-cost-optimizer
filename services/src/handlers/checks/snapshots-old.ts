import { DescribeSnapshotsCommand } from '@aws-sdk/client-ec2'
import type { SQSEvent } from 'aws-lambda'

import { createFinding, type CheckType } from '../../domain/finding.js'
import { snapshotMonthlyCost } from '../../domain/pricing.js'
import { upsertFinding } from '../../infra/findings-repo.js'
import { metrics, MetricUnit } from '../../infra/metrics.js'
import { logger } from '../../shared/logger.js'
import { ec2Client } from '../../shared/aws-clients.js'
import type { AwsRegion } from '../../domain/pricing.js'

const CHECK_TYPE: CheckType = 'snapshots-old'
const AGE_THRESHOLD_DAYS = 90
const TTL_DAYS = Number(process.env['FINDINGS_TTL_DAYS'] ?? '90')

export const handler = async (_event: SQSEvent): Promise<void> => {
  const accountId = process.env['AWS_ACCOUNT_ID'] ?? 'unknown'
  const region = (process.env['AWS_REGION'] ?? 'us-east-1') as AwsRegion

  const response = await ec2Client.send(
    new DescribeSnapshotsCommand({ OwnerIds: ['self'] }),
  )

  const now = Date.now()
  const cutoff = now - AGE_THRESHOLD_DAYS * 86400 * 1000
  const oldSnapshots = (response.Snapshots ?? []).filter(
    s => s.StartTime && s.StartTime.getTime() < cutoff,
  )

  let findingsCount = 0
  for (const snap of oldSnapshots) {
    const snapId = snap.SnapshotId
    const sizeGb = snap.VolumeSize ?? 0
    if (!snapId) continue

    const ageDays = Math.floor((now - (snap.StartTime?.getTime() ?? 0)) / 86400000)
    const monthlySavingsUsd = snapshotMonthlyCost(sizeGb)

    const finding = createFinding({
      accountId,
      region,
      checkType: CHECK_TYPE,
      resourceId: snapId,
      title: `Old EBS snapshot: ${snapId}`,
      description: `Snapshot ${snapId} (${sizeGb} GiB) is ${ageDays} days old. Consider deleting if no longer needed.`,
      monthlySavingsUsd,
      metadata: { sizeGb, ageDays, description: snap.Description, volumeId: snap.VolumeId },
      ttlDays: TTL_DAYS,
    })

    await upsertFinding(finding)
    findingsCount++
  }

  metrics.addMetric('FindingsDetected', MetricUnit.Count, findingsCount)
  metrics.addDimensions({ CheckType: CHECK_TYPE })
  metrics.publishStoredMetrics()
  logger.info('snapshots-old check complete', { total: response.Snapshots?.length ?? 0, findings: findingsCount })
}
