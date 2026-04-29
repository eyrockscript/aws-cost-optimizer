import { DescribeAddressesCommand } from '@aws-sdk/client-ec2'
import type { SQSEvent } from 'aws-lambda'

import { createFinding, type CheckType } from '../../domain/finding.js'
import { eipMonthlyCost } from '../../domain/pricing.js'
import { upsertFinding } from '../../infra/findings-repo.js'
import { metrics, MetricUnit } from '../../infra/metrics.js'
import { logger } from '../../shared/logger.js'
import { ec2Client } from '../../shared/aws-clients.js'
import type { AwsRegion } from '../../domain/pricing.js'

const CHECK_TYPE: CheckType = 'eip-unassoc'
const TTL_DAYS = Number(process.env['FINDINGS_TTL_DAYS'] ?? '90')

export const handler = async (_event: SQSEvent): Promise<void> => {
  const accountId = process.env['AWS_ACCOUNT_ID'] ?? 'unknown'
  const region = (process.env['AWS_REGION'] ?? 'us-east-1') as AwsRegion

  const response = await ec2Client.send(new DescribeAddressesCommand({}))
  const addresses = (response.Addresses ?? []).filter(a => !a.AssociationId)

  let findingsCount = 0
  for (const addr of addresses) {
    const allocationId = addr.AllocationId ?? addr.PublicIp ?? 'unknown'
    const monthlySavingsUsd = eipMonthlyCost()

    const finding = createFinding({
      accountId,
      region,
      checkType: CHECK_TYPE,
      resourceId: allocationId,
      title: `Unassociated Elastic IP: ${addr.PublicIp ?? allocationId}`,
      description: `EIP ${addr.PublicIp} is allocated but not associated with any instance or NAT gateway.`,
      monthlySavingsUsd,
      metadata: { publicIp: addr.PublicIp, domain: addr.Domain },
      ttlDays: TTL_DAYS,
    })

    await upsertFinding(finding)
    findingsCount++
  }

  metrics.addMetric('FindingsDetected', MetricUnit.Count, findingsCount)
  metrics.addDimensions({ CheckType: CHECK_TYPE })
  metrics.publishStoredMetrics()
  logger.info('eip-unassoc check complete', { unassociated: addresses.length, findings: findingsCount })
}
