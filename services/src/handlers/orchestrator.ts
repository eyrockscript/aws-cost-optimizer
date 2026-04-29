import { SendMessageCommand } from '@aws-sdk/client-sqs'
import type { ScheduledEvent } from 'aws-lambda'

import { logger } from '../shared/logger.js'
import { sqsClient } from '../shared/aws-clients.js'
import { metrics, MetricUnit } from '../infra/metrics.js'

const CHECK_NAMES = [
  'EC2_IDLE',
  'EBS_ORPHAN',
  'EIP_UNASSOC',
  'RDS_UNDERUTILIZED',
  'SNAPSHOTS_OLD',
  'NAT_GW_LOW_TRAFFIC',
  'LAMBDA_OVERPROVISIONED',
] as const

export const handler = async (event: ScheduledEvent): Promise<void> => {
  logger.addContext({ requestId: event.id })
  logger.info('Orchestrator triggered', { source: event.source })

  const results = await Promise.allSettled(
    CHECK_NAMES.map(async (checkName) => {
      const queueUrl = process.env[checkName]
      if (!queueUrl) {
        logger.warn('Queue URL not configured', { checkName })
        return
      }
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify({ checkName, triggeredAt: new Date().toISOString() }),
        }),
      )
      logger.info('Message sent to queue', { checkName })
    }),
  )

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (failures.length > 0) {
    logger.error('Some checks failed to enqueue', { failures: failures.map(f => String(f.reason)) })
  }

  metrics.addMetric('ChecksEnqueued', MetricUnit.Count, CHECK_NAMES.length - failures.length)
  metrics.publishStoredMetrics()
}
