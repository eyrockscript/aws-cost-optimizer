# ADR-0001: Single-Table DynamoDB Design

**Status:** Accepted  
**Date:** 2026-04-29

## Context

The system stores cost optimization findings that need to support:
1. Fetching all active findings sorted by estimated savings (highest first)
2. Looking up a single finding by resource ID for dismissal
3. Summarizing findings by check type and region

Multiple AWS resources (EC2, EBS, RDS, EIP, NAT GW, Snapshots, Lambda) produce findings with the same lifecycle but different metadata shapes.

## Decision

Use a single DynamoDB table with a composite primary key (`pk` + `sk`) and one GSI (`gsi1pk` + `gsi1sk`).

- `pk = ACCOUNT#<accountId>` — isolates data per AWS account for future multi-account support
- `sk = FINDING#<region>#<checkType>#<resourceId>` — enables direct lookup and upserts without a scan
- `gsi1pk = STATUS#<active|dismissed>` — partitions the index by lifecycle state
- `gsi1sk = SAVINGS#<zero-padded-cents>` — enables sorted reads by savings descending

Dismissed findings get a TTL of 90 days to auto-expire without manual cleanup jobs.

## Alternatives Considered

- **Multiple tables per resource type**: Rejected — would require cross-table queries for the sorted summary, fan-out reads with complex application-side merging.
- **GSI per check type**: Rejected — 7 GSIs adds cost and operational complexity; filter expressions on the single GSI are sufficient given expected cardinality (< 1,000 active findings).

## Consequences

- All access patterns are served with single-digit millisecond latency.
- Adding a new check type requires zero schema changes.
- Query result ordering is handled at the database layer, not application layer.
- The padded savings key format requires the application to format correctly (`SAVINGS#0000000025000` for $250.00).
