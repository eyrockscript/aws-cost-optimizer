# Cost Model

This document explains how the system calculates estimated monthly savings for each finding.

## Pricing Reference (us-east-1, on-demand, as of Q1 2026)

All prices are in USD per hour unless noted. The application stores these in `services/src/domain/pricing.ts`.

### EC2 Instances (idle)

An instance is considered idle when average CPU utilization is below 5% for 7 consecutive days.

| Instance Type | $/hour | $/month (est.) |
|---------------|--------|----------------|
| t3.micro | $0.0104 | $7.49 |
| t3.small | $0.0208 | $14.98 |
| t3.medium | $0.0416 | $29.95 |
| t3.large | $0.0832 | $59.90 |
| m5.large | $0.096 | $69.12 |
| m5.xlarge | $0.192 | $138.24 |
| m5.2xlarge | $0.384 | $276.48 |

**Calculation:** `monthlySavingsUsd = pricePerHour × 730`

### EBS Volumes (orphaned)

A volume is orphaned when it is in `available` state (not attached to any instance) for more than 7 days.

| Volume Type | $/GB-month |
|-------------|------------|
| gp3 | $0.08 |
| gp2 | $0.10 |
| io1 | $0.125 + $0.065/IOPS |
| st1 | $0.045 |
| sc1 | $0.015 |

**Calculation:** `monthlySavingsUsd = sizeGb × pricePerGbMonth`

### Elastic IPs (unassociated)

AWS charges $0.005/hour for any EIP not associated with a running instance.

**Calculation:** `monthlySavingsUsd = 0.005 × 730 = $3.65/EIP`

### NAT Gateways (low traffic)

A NAT Gateway is flagged when total bytes processed < 1 GB/day for 7 consecutive days.

| Component | Price |
|-----------|-------|
| Hourly rate | $0.045/hour |
| Data processing | $0.045/GB |

**Calculation:** `monthlySavingsUsd = 0.045 × 730 = $32.85` (hourly component only; data already minimal)

### RDS Instances (underutilized)

Flagged when average CPU < 10% and average connections < 5 for 7 days.

| Instance Type | $/hour | $/month |
|---------------|--------|---------|
| db.t3.micro | $0.017 | $12.41 |
| db.t3.small | $0.034 | $24.82 |
| db.t3.medium | $0.068 | $49.64 |
| db.m5.large | $0.171 | $124.83 |

**Calculation:** `monthlySavingsUsd = pricePerHour × 730`

### EBS Snapshots (old)

Snapshots older than 90 days with no associated instance are flagged.

| Storage | Price |
|---------|-------|
| EBS snapshot storage | $0.05/GB-month |

**Calculation:** `monthlySavingsUsd = snapshotSizeGb × 0.05`

### Lambda Functions (overprovisioned)

Flagged when max memory used < 50% of configured memory for 30 days.

**Calculation (Lambda cost):**
```
requestCost = invocations × $0.0000002
computeCost = durationMs × memory_GB × $0.0000166667 / 1000
monthlySavings = computeCost × (1 - usedMemory / configuredMemory) × 0.5
```

*Note: Lambda savings are often small ($0.01–$2.00/month) but the finding is valuable to reduce cold start time.*

---

## Severity Thresholds

| Severity | Monthly Savings |
|----------|----------------|
| 🔴 high | ≥ $100/month |
| 🟡 medium | $20–$99.99/month |
| 🟢 low | < $20/month |

These thresholds are defined in `services/src/domain/severity.ts` and can be adjusted without changing the storage schema.

---

## Disclaimer

Prices are approximate and region-dependent. The system uses on-demand pricing as a conservative baseline. Reserved Instance or Savings Plan discounts are not factored in — actual savings may differ. Always verify current pricing at [https://aws.amazon.com/pricing/](https://aws.amazon.com/pricing/).
