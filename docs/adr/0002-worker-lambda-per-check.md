# ADR-0002: One Lambda Worker Per Check Type

**Status:** Accepted  
**Date:** 2026-04-29

## Context

The system must scan 7 distinct resource categories (EC2 idle, EBS orphan, EIP unassociated, RDS underutilized, old snapshots, NAT GW low traffic, Lambda overprovisioned). Each check calls different AWS APIs, has different evaluation logic, and may take different amounts of time depending on resource count.

## Decision

Each check type has its own Lambda function, independently deployed and invoked via its own SQS queue.

## Alternatives Considered

- **Single monolithic Lambda with internal dispatch**: All checks run sequentially in one 15-minute max Lambda. Rejected — one slow check (e.g., RDS CloudWatch lookback) blocks all others. A single failure aborts the entire scan. Bundle size grows with every new check.
- **Lambda with parallel internal threads**: Uses `Promise.allSettled()` within a single Lambda. Rejected — 7 concurrent AWS API calls within one Lambda risks hitting CloudWatch/EC2 API rate limits in the same execution context. Harder to set per-check memory/timeout independently.

## Consequences

- Each worker has its own IAM role with minimum required permissions (EC2 Describe only, or RDS Describe only, etc.).
- Timeouts, memory, and concurrency limits are tuned per check without affecting others.
- A failing snapshot check does not prevent the EIP check from completing.
- Adding a new check type means adding one new Lambda + one new SQS queue — no changes to existing code.
- Cold start is not a concern for a background daily scan.
