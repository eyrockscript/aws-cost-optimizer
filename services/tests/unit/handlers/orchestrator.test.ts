import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/shared/aws-clients.js', () => ({
  sqsClient: { send: vi.fn() },
}))

vi.mock('../../../src/infra/metrics.js', () => ({
  metrics: { addMetric: vi.fn(), publishStoredMetrics: vi.fn() },
  MetricUnit: { Count: 'Count' },
}))

vi.mock('../../../src/shared/logger.js', () => ({
  logger: { addContext: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { sqsClient } from '../../../src/shared/aws-clients.js'
import { handler } from '../../../src/handlers/orchestrator.js'
import type { ScheduledEvent, Context } from 'aws-lambda'

const mockContext: Context = {
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:orchestrator',
  awsRequestId: 'test-request-id',
  functionName: 'orchestrator',
  functionVersion: '$LATEST',
  memoryLimitInMB: '128',
  logGroupName: '/aws/lambda/orchestrator',
  logStreamName: 'test-stream',
  callbackWaitsForEmptyEventLoop: false,
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
}

const mockSend = vi.mocked(sqsClient.send)

beforeEach(() => {
  vi.clearAllMocks()
  process.env['EC2_IDLE'] = 'https://sqs.us-east-1.amazonaws.com/123/ec2-idle'
  process.env['EBS_ORPHAN'] = 'https://sqs.us-east-1.amazonaws.com/123/ebs-orphan'
  process.env['EIP_UNASSOC'] = 'https://sqs.us-east-1.amazonaws.com/123/eip-unassoc'
  process.env['RDS_UNDERUTILIZED'] = 'https://sqs.us-east-1.amazonaws.com/123/rds'
  process.env['SNAPSHOTS_OLD'] = 'https://sqs.us-east-1.amazonaws.com/123/snapshots'
  process.env['NAT_GW_LOW_TRAFFIC'] = 'https://sqs.us-east-1.amazonaws.com/123/natgw'
  process.env['LAMBDA_OVERPROVISIONED'] = 'https://sqs.us-east-1.amazonaws.com/123/lambda'
})

const fakeEvent: ScheduledEvent = {
  id: 'test-id',
  version: '0',
  account: '123456789012',
  time: new Date().toISOString(),
  region: 'us-east-1',
  resources: [],
  source: 'aws.events',
  'detail-type': 'Scheduled Event',
  detail: {},
}

describe('orchestrator handler', () => {
  it('sends 7 SQS messages when all queues are configured', async () => {
    mockSend.mockResolvedValue({})
    await handler(fakeEvent, mockContext)
    expect(mockSend).toHaveBeenCalledTimes(7)
  })

  it('continues if one queue fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('throttled')).mockResolvedValue({})
    await handler(fakeEvent, mockContext)
    expect(mockSend.mock.calls.length).toBeGreaterThanOrEqual(6)
  })
})
