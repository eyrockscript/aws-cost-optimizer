import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

import { getSummary } from '../../infra/findings-repo.js'
import { logger } from '../../shared/logger.js'
import { toApiResponse, UnauthorizedError } from '../../shared/errors.js'

const API_KEY = process.env['API_KEY'] ?? ''

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const providedKey = event.headers['x-api-key'] ?? ''
    if (API_KEY && providedKey !== API_KEY) throw new UnauthorizedError()

    const summary = await getSummary()
    logger.info('get-summary', { totalActive: summary.totalActive })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(summary),
    }
  } catch (err) {
    logger.error('get-summary error', { err })
    return toApiResponse(err)
  }
}
