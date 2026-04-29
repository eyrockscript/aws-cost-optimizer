export type AwsRegion =
  | 'us-east-1'
  | 'us-east-2'
  | 'us-west-1'
  | 'us-west-2'
  | 'eu-west-1'
  | 'eu-central-1'
  | 'ap-southeast-1'
  | 'ap-northeast-1'

const HOURS_PER_MONTH = 730

const EC2_ON_DEMAND_USD_PER_HOUR: Record<string, Partial<Record<AwsRegion, number>>> = {
  'm5.large':    { 'us-east-1': 0.096,  'us-west-2': 0.096,  'eu-west-1': 0.107,  'eu-central-1': 0.112 },
  'm5.xlarge':   { 'us-east-1': 0.192,  'us-west-2': 0.192,  'eu-west-1': 0.214,  'eu-central-1': 0.224 },
  'm5.2xlarge':  { 'us-east-1': 0.384,  'us-west-2': 0.384,  'eu-west-1': 0.428,  'eu-central-1': 0.448 },
  't3.micro':    { 'us-east-1': 0.0104, 'us-west-2': 0.0104, 'eu-west-1': 0.0116, 'eu-central-1': 0.0124 },
  't3.small':    { 'us-east-1': 0.0208, 'us-west-2': 0.0208, 'eu-west-1': 0.0232, 'eu-central-1': 0.0248 },
  't3.medium':   { 'us-east-1': 0.0416, 'us-west-2': 0.0416, 'eu-west-1': 0.0464, 'eu-central-1': 0.0496 },
  't3.large':    { 'us-east-1': 0.0832, 'us-west-2': 0.0832, 'eu-west-1': 0.0928, 'eu-central-1': 0.0992 },
  't3.xlarge':   { 'us-east-1': 0.1664, 'us-west-2': 0.1664, 'eu-west-1': 0.1856, 'eu-central-1': 0.1984 },
}

const EBS_GP3_USD_PER_GB_MONTH = 0.08
const EIP_UNASSOC_USD_PER_HOUR = 0.005
const NAT_GW_USD_PER_HOUR = 0.045
const SNAPSHOT_USD_PER_GB_MONTH = 0.05

export function ec2MonthlyCost(instanceType: string, region: AwsRegion): number {
  const hourlyRate = EC2_ON_DEMAND_USD_PER_HOUR[instanceType]?.[region] ?? 0.1
  return hourlyRate * HOURS_PER_MONTH
}

export function ebsMonthlyCost(sizeGb: number): number {
  return sizeGb * EBS_GP3_USD_PER_GB_MONTH
}

export function eipMonthlyCost(): number {
  return EIP_UNASSOC_USD_PER_HOUR * HOURS_PER_MONTH
}

export function natGwMonthlyCost(): number {
  return NAT_GW_USD_PER_HOUR * HOURS_PER_MONTH
}

export function snapshotMonthlyCost(sizeGb: number): number {
  return sizeGb * SNAPSHOT_USD_PER_GB_MONTH
}

export function lambdaMonthlySavingsFromDownsize(
  currentMemoryMb: number,
  recommendedMemoryMb: number,
  avgInvocationsPerMonth: number,
  avgDurationMs: number,
): number {
  const gbSeconds = (memMb: number) => (memMb / 1024) * (avgDurationMs / 1000) * avgInvocationsPerMonth
  const pricePerGbSecond = 0.0000166667
  const current = gbSeconds(currentMemoryMb) * pricePerGbSecond
  const recommended = gbSeconds(recommendedMemoryMb) * pricePerGbSecond
  return Math.max(0, current - recommended)
}
