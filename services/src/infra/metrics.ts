import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics'

export const metrics = new Metrics({ namespace: 'CostOptimizer', serviceName: 'aws-cost-optimizer' })

export { MetricUnit }
