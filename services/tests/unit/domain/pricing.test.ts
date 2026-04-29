import { describe, it, expect } from 'vitest'
import {
  ec2MonthlyCost,
  ebsMonthlyCost,
  eipMonthlyCost,
  natGwMonthlyCost,
  snapshotMonthlyCost,
  lambdaMonthlySavingsFromDownsize,
} from '../../../src/domain/pricing.js'

describe('ec2MonthlyCost', () => {
  it('returns known price for m5.large us-east-1', () => {
    expect(ec2MonthlyCost('m5.large', 'us-east-1')).toBeCloseTo(0.096 * 730)
  })

  it('falls back to 0.1/h for unknown instance type', () => {
    expect(ec2MonthlyCost('p4d.24xlarge', 'us-east-1')).toBeCloseTo(0.1 * 730)
  })
})

describe('ebsMonthlyCost', () => {
  it('charges $0.08/GB/month', () => {
    expect(ebsMonthlyCost(100)).toBeCloseTo(8)
  })
})

describe('eipMonthlyCost', () => {
  it('charges $0.005/h', () => {
    expect(eipMonthlyCost()).toBeCloseTo(0.005 * 730)
  })
})

describe('natGwMonthlyCost', () => {
  it('charges $0.045/h', () => {
    expect(natGwMonthlyCost()).toBeCloseTo(0.045 * 730)
  })
})

describe('snapshotMonthlyCost', () => {
  it('charges $0.05/GB/month', () => {
    expect(snapshotMonthlyCost(200)).toBeCloseTo(10)
  })
})

describe('lambdaMonthlySavingsFromDownsize', () => {
  it('returns positive savings when downsizing', () => {
    const savings = lambdaMonthlySavingsFromDownsize(1024, 256, 1_000_000, 500)
    expect(savings).toBeGreaterThan(0)
  })

  it('returns 0 when recommended >= current', () => {
    const savings = lambdaMonthlySavingsFromDownsize(256, 512, 1_000_000, 500)
    expect(savings).toBe(0)
  })
})
