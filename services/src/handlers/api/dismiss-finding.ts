import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

import { dismissFindingById, getFinding } from '../../infra/findings-repo.js'
import { buildFindingKeys } from '../../domain/finding.js'
import { logger } from '../../shared/logger.js'
import { toApiResponse, UnauthorizedError, NotFoundError, ValidationError } from '../../shared/errors.js'

const API_KEY = process.env['API_KEY'] ?? ''

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const providedKey = event.headers['x-api-key'] ?? ''
    if (API_KEY && providedKey !== API_KEY) throw new UnauthorizedError()

    const rawId = event.pathParameters?.['id']
    if (!rawId) throw new ValidationError('Path parameter id is required')

    const decodedId = decodeURIComponent(rawId)
    const parts = decodedId.split('#')
    if (parts.length < 8) throw new ValidationError('Invalid finding id format')

    const accountId = parts[1] ?? ''
    const region = parts[3] ?? ''
    const checkType = parts[5] as Parameters<typeof buildFindingKeys>[2]
    const resourceId = parts.slice(7).join('#')

    const { pk, sk } = buildFindingKeys(accountId, region, checkType, resourceId)
    const existing = await getFinding(pk, sk)
    if (!existing) throw new NotFoundError('finding', decodedId)

    await dismissFindingById(pk, sk)
    logger.info('finding dismissed', { pk, sk })

    return { statusCode: 204, body: '' }
  } catch (err) {
    logger.error('dismiss-finding error', { err })
    return toApiResponse(err)
  }
}
