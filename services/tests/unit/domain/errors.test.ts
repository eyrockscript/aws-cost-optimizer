import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  toRfc7807,
  toApiResponse,
} from '../../../src/shared/errors.js'

describe('AppError', () => {
  it('sets properties correctly', () => {
    const err = new AppError('test', 400, 'test_type', 'detail here')
    expect(err.statusCode).toBe(400)
    expect(err.type).toBe('test_type')
    expect(err.detail).toBe('detail here')
    expect(err.name).toBe('AppError')
  })
})

describe('NotFoundError', () => {
  it('has statusCode 404', () => {
    const err = new NotFoundError('finding', 'abc')
    expect(err.statusCode).toBe(404)
    expect(err.type).toBe('not_found')
  })
})

describe('ValidationError', () => {
  it('has statusCode 400', () => {
    const err = new ValidationError('bad input')
    expect(err.statusCode).toBe(400)
    expect(err.type).toBe('validation_error')
  })
})

describe('UnauthorizedError', () => {
  it('has statusCode 401', () => {
    const err = new UnauthorizedError()
    expect(err.statusCode).toBe(401)
  })
})

describe('toRfc7807', () => {
  it('maps AppError to RFC 7807 shape', () => {
    const err = new NotFoundError('finding', 'xyz')
    const problem = toRfc7807(err)
    expect(problem.status).toBe(404)
    expect(problem.type).toContain('not_found')
  })

  it('returns 500 for unknown error', () => {
    const problem = toRfc7807(new Error('oops'))
    expect(problem.status).toBe(500)
  })
})

describe('toApiResponse', () => {
  it('returns correct statusCode and content-type', () => {
    const response = toApiResponse(new UnauthorizedError())
    expect(response.statusCode).toBe(401)
    expect(response.headers['Content-Type']).toBe('application/problem+json')
    const body = JSON.parse(response.body) as { status: number }
    expect(body.status).toBe(401)
  })
})
