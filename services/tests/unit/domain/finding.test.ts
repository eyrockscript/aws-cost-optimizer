import { describe, it, expect, vi, afterEach } from 'vitest'
import { createFinding, buildFindingKeys, dismissFinding } from '../../../src/domain/finding.js'

describe('buildFindingKeys', () => {
  it('builds correct pk and sk', () => {
    const { pk, sk } = buildFindingKeys('123456789012', 'us-east-1', 'ec2-idle', 'i-abc123')
    expect(pk).toBe('ACCOUNT#123456789012')
    expect(sk).toBe('FINDING#us-east-1#ec2-idle#i-abc123')
  })
})

describe('createFinding', () => {
  const base = {
    accountId: '123456789012',
    region: 'us-east-1',
    checkType: 'ec2-idle' as const,
    resourceId: 'i-abc123',
    title: 'Idle EC2',
    description: 'Low CPU',
    monthlySavingsUsd: 50,
  }

  it('creates finding with status active', () => {
    const finding = createFinding(base)
    expect(finding.status).toBe('active')
    expect(finding.pk).toBe('ACCOUNT#123456789012')
    expect(finding.sk).toBe('FINDING#us-east-1#ec2-idle#i-abc123')
    expect(finding.gsi1pk).toBe('STATUS#active')
  })

  it('assigns severity medium for $50/mo', () => {
    const finding = createFinding(base)
    expect(finding.severity).toBe('medium')
  })

  it('assigns severity high for $100/mo', () => {
    const finding = createFinding({ ...base, monthlySavingsUsd: 100 })
    expect(finding.severity).toBe('high')
  })

  it('assigns severity low for $10/mo', () => {
    const finding = createFinding({ ...base, monthlySavingsUsd: 10 })
    expect(finding.severity).toBe('low')
  })

  it('zero-pads gsi1sk to 12 digits', () => {
    const finding = createFinding({ ...base, monthlySavingsUsd: 5.5 })
    expect(finding.gsi1sk).toBe('SAVINGS#000000000550')
  })

  it('sets ttl when ttlDays is provided', () => {
    const finding = createFinding({ ...base, ttlDays: 30 })
    expect(finding.ttl).toBeDefined()
    const expectedTtl = Math.floor(Date.now() / 1000) + 30 * 86400
    expect(Math.abs((finding.ttl ?? 0) - expectedTtl)).toBeLessThan(5)
  })

  it('omits ttl when ttlDays is undefined', () => {
    const finding = createFinding(base)
    expect(finding.ttl).toBeUndefined()
  })
})

describe('dismissFinding', () => {
  afterEach(() => { vi.useRealTimers() })

  it('changes status to dismissed and updates gsi1pk', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const finding = createFinding({
      accountId: '123456789012',
      region: 'us-east-1',
      checkType: 'ec2-idle',
      resourceId: 'i-abc',
      title: 'Test',
      description: 'Test',
      monthlySavingsUsd: 50,
    })
    vi.setSystemTime(new Date('2026-01-01T00:01:00.000Z'))
    const dismissed = dismissFinding(finding)
    expect(dismissed.status).toBe('dismissed')
    expect(dismissed.gsi1pk).toBe('STATUS#dismissed')
    expect(dismissed.updatedAt).not.toBe(finding.updatedAt)
  })
})
