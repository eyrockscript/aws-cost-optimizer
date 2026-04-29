import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/shared/aws-clients.js', () => ({
  ec2Client: { send: vi.fn() },
  cloudWatchClient: { send: vi.fn() },
  sqsClient: { send: vi.fn() },
  ddbDocClient: { send: vi.fn() },
}))

vi.mock('../../../src/infra/findings-repo.js', () => ({
  upsertFinding: vi.fn(),
}))

vi.mock('../../../src/infra/metrics.js', () => ({
  metrics: { addMetric: vi.fn(), addDimensions: vi.fn(), publishStoredMetrics: vi.fn() },
  MetricUnit: { Count: 'Count' },
}))

import { ec2Client, cloudWatchClient } from '../../../src/shared/aws-clients.js'
import { upsertFinding } from '../../../src/infra/findings-repo.js'
import { handler } from '../../../src/handlers/checks/ec2-idle.js'
import type { SQSEvent } from 'aws-lambda'

const mockEc2Send = vi.mocked(ec2Client.send)
const mockCwSend = vi.mocked(cloudWatchClient.send)
const mockUpsert = vi.mocked(upsertFinding)

const fakeSqsEvent: SQSEvent = { Records: [] }

beforeEach(() => {
  vi.clearAllMocks()
  process.env['FINDINGS_TABLE'] = 'test-table'
  process.env['AWS_ACCOUNT_ID'] = '123456789012'
  process.env['AWS_REGION'] = 'us-east-1'
})

describe('ec2-idle handler', () => {
  it('creates finding for idle instance', async () => {
    mockEc2Send.mockResolvedValueOnce({
      Reservations: [{
        Instances: [{
          InstanceId: 'i-abc123',
          InstanceType: 't3.medium',
          Tags: [{ Key: 'Name', Value: 'MyServer' }],
        }],
      }],
    })

    mockCwSend.mockResolvedValueOnce({
      Datapoints: [{ Average: 2.5 }],
    })

    await handler(fakeSqsEvent)
    expect(mockUpsert).toHaveBeenCalledOnce()

    const finding = mockUpsert.mock.calls[0]?.[0]
    expect(finding?.checkType).toBe('ec2-idle')
    expect(finding?.resourceId).toBe('i-abc123')
    expect(finding?.severity).toBe('medium')
  })

  it('skips active instance above threshold', async () => {
    mockEc2Send.mockResolvedValueOnce({
      Reservations: [{
        Instances: [{ InstanceId: 'i-busy', InstanceType: 't3.large' }],
      }],
    })
    mockCwSend.mockResolvedValueOnce({
      Datapoints: [{ Average: 60 }],
    })

    await handler(fakeSqsEvent)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('handles empty reservations gracefully', async () => {
    mockEc2Send.mockResolvedValueOnce({ Reservations: [] })
    await handler(fakeSqsEvent)
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})
