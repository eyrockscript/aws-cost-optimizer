# Architectural Decision Records

This directory documents the key architectural decisions made for this project using the [MADR](https://adr.github.io/madr/) format.

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-single-table-dynamodb.md) | Single-table DynamoDB design | Accepted |
| [0002](0002-worker-lambda-per-check.md) | One Lambda worker per check type | Accepted |
| [0003](0003-sqs-between-orchestrator-and-workers.md) | SQS as decoupling layer | Accepted |
| [0004](0004-api-key-vs-cognito.md) | API key authentication over Cognito | Accepted |
