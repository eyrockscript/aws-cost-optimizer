# ADR-0003: SQS as Decoupling Layer Between Orchestrator and Workers

**Status:** Accepted  
**Date:** 2026-04-29

## Context

The orchestrator Lambda is triggered by EventBridge and must fan out work to 7 worker Lambdas. Several invocation patterns exist: direct Lambda-to-Lambda invocation (synchronous or async), Step Functions, and queue-based decoupling via SQS.

## Decision

The orchestrator sends one message per check to its dedicated SQS queue. Each worker Lambda is triggered by its queue via an Event Source Mapping.

## Alternatives Considered

- **Direct async Lambda invocation (`InvokeAsync`)**: Orchestrator calls each worker Lambda directly. Rejected — if a worker fails, the orchestrator has no visibility. Retry logic requires application code. No natural DLQ support.
- **AWS Step Functions**: Full workflow orchestration with visual debugging. Rejected — Step Functions adds cost ($25 per 1M state transitions) and operational complexity that is not justified for a daily batch that runs once and doesn't require conditional branching between steps.
- **SNS fan-out**: Orchestrator publishes to an SNS topic; workers subscribe. Rejected — SNS delivers to all subscribers simultaneously but does not provide per-queue DLQ or per-subscriber concurrency control.

## Consequences

- Each SQS queue has a DLQ. Messages that fail 3 times are parked in the DLQ for investigation without data loss.
- Redrive policy allows replaying failed messages without re-running the full scan.
- SQS visibility timeout is set to 2× the worker Lambda timeout to prevent duplicate processing during retries.
- The orchestrator is decoupled from worker availability — it does not wait for workers to complete.
