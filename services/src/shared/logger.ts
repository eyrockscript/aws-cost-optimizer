import { Logger } from '@aws-lambda-powertools/logger'

export const logger = new Logger({
  serviceName: 'aws-cost-optimizer',
  logLevel: (process.env['LOG_LEVEL'] as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR') ?? 'INFO',
})
