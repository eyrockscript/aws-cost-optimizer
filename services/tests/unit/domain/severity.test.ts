import { describe, it, expect } from 'vitest'
import { computeSeverity, severityWeight } from '../../../src/domain/severity.js'

describe('computeSeverity', () => {
  it('returns high for >= $100', () => {
    expect(computeSeverity(100)).toBe('high')
    expect(computeSeverity(500)).toBe('high')
  })
  it('returns medium for $20-$99.99', () => {
    expect(computeSeverity(20)).toBe('medium')
    expect(computeSeverity(99.99)).toBe('medium')
  })
  it('returns low for < $20', () => {
    expect(computeSeverity(0)).toBe('low')
    expect(computeSeverity(19.99)).toBe('low')
  })
})

describe('severityWeight', () => {
  it('high > medium > low', () => {
    expect(severityWeight('high')).toBeGreaterThan(severityWeight('medium'))
    expect(severityWeight('medium')).toBeGreaterThan(severityWeight('low'))
  })
})
