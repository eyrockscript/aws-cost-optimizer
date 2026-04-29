export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly type: string,
    readonly detail?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, 404, 'not_found', `No ${resource} with id ${id}`)
  }
}

export class ValidationError extends AppError {
  constructor(detail: string) {
    super('Validation failed', 400, 'validation_error', detail)
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('Unauthorized', 401, 'unauthorized')
  }
}

export interface Rfc7807Problem {
  type: string
  title: string
  status: number
  detail?: string
}

export function toRfc7807(error: unknown): Rfc7807Problem {
  if (error instanceof AppError) {
    return {
      type: `https://errors.aws-cost-optimizer.dev/${error.type}`,
      title: error.message,
      status: error.statusCode,
      detail: error.detail,
    }
  }
  return {
    type: 'https://errors.aws-cost-optimizer.dev/internal_error',
    title: 'Internal Server Error',
    status: 500,
  }
}

export function toApiResponse(error: unknown): {
  statusCode: number
  headers: Record<string, string>
  body: string
} {
  const problem = toRfc7807(error)
  return {
    statusCode: problem.status,
    headers: { 'Content-Type': 'application/problem+json' },
    body: JSON.stringify(problem),
  }
}
