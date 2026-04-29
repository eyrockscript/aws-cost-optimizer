import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

import { listActiveFindings } from '../../infra/findings-repo.js'
import { logger } from '../../shared/logger.js'
import { toApiResponse, UnauthorizedError } from '../../shared/errors.js'
import { ListFindingsQuerySchema } from '../../schemas/list-findings.js'

const API_KEY = process.env['API_KEY'] ?? ''

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const providedKey = event.headers['x-api-key'] ?? ''
    if (API_KEY && providedKey !== API_KEY) throw new UnauthorizedError()

    const parsed = ListFindingsQuerySchema.safeParse(event.queryStringParameters ?? {})
    if (!parsed.success) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: parsed.error.flatten() }),
      }
    }

    const { limit, nextToken } = parsed.data
    const exclusiveStartKey = nextToken
      ? (JSON.parse(Buffer.from(nextToken, 'base64').toString('utf8')) as Record<string, unknown>)
      : undefined

    const { items, lastKey } = await listActiveFindings(limit, exclusiveStartKey)

    const responseNextToken = lastKey
      ? Buffer.from(JSON.stringify(lastKey)).toString('base64')
      : undefined

    logger.info('list-findings', { count: items.length })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, nextToken: responseNextToken }),
    }
  } catch (err) {
    logger.error('list-findings error', { err })
    return toApiResponse(err)
  }
}
