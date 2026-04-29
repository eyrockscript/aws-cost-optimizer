import { CloudWatchClient } from '@aws-sdk/client-cloudwatch'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { EC2Client } from '@aws-sdk/client-ec2'
import { LambdaClient } from '@aws-sdk/client-lambda'
import { RDSClient } from '@aws-sdk/client-rds'
import { SNSClient } from '@aws-sdk/client-sns'
import { SQSClient } from '@aws-sdk/client-sqs'
import { SSMClient } from '@aws-sdk/client-ssm'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const region = process.env['AWS_REGION'] ?? 'us-east-1'
const endpoint = process.env['AWS_ENDPOINT_URL']

const baseConfig = { region, ...(endpoint ? { endpoint } : {}) }

export const ddbClient = new DynamoDBClient(baseConfig)
export const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
})
export const sqsClient = new SQSClient(baseConfig)
export const cloudWatchClient = new CloudWatchClient(baseConfig)
export const ec2Client = new EC2Client(baseConfig)
export const rdsClient = new RDSClient(baseConfig)
export const lambdaClient = new LambdaClient(baseConfig)
export const snsClient = new SNSClient(baseConfig)
export const ssmClient = new SSMClient(baseConfig)
