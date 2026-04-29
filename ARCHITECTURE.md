# Architecture

## System Overview

AWS Cost Optimizer is an event-driven serverless system that runs a daily scan across 7 resource categories, stores findings in a DynamoDB single-table, and exposes them through an API and React dashboard. All infrastructure is declared in Terraform with reusable modules.

---

## System Architecture

```mermaid
flowchart TD
    EB[["EventBridge\nCron 02:00 UTC"]]
    ORCH["Lambda\nOrchestrator"]
    SQS1["SQS\nec2-idle"]
    SQS2["SQS\nebs-orphan"]
    SQS3["SQS\neip-unassoc"]
    SQS4["SQS\nrds-underutilized"]
    SQS5["SQS\nsnapshots-old"]
    SQS6["SQS\nnat-gw-low-traffic"]
    SQS7["SQS\nlambda-overprov"]
    W1["Lambda\nEC2 Idle Check"]
    W2["Lambda\nEBS Orphan Check"]
    W3["Lambda\nEIP Unassociated"]
    W4["Lambda\nRDS Underutilized"]
    W5["Lambda\nOld Snapshots"]
    W6["Lambda\nNAT GW Low Traffic"]
    W7["Lambda\nLambda Overprovisioned"]
    DDB[("DynamoDB\nSingle-Table\n+ GSI1")]
    CW["CloudWatch\nMetrics + Alarms"]
    SNS["SNS\nAlerts Topic"]
    APIGW["API Gateway\nHTTP API"]
    LAL["Lambda\nlist-findings"]
    LAS["Lambda\nget-summary"]
    LAD["Lambda\ndismiss-finding"]
    FE["React Dashboard\nS3 + CloudFront"]
    DEV[/"Developer / User"/]

    EB -->|"triggers"| ORCH
    ORCH -->|"fan-out"| SQS1 & SQS2 & SQS3 & SQS4 & SQS5 & SQS6 & SQS7
    SQS1 --> W1
    SQS2 --> W2
    SQS3 --> W3
    SQS4 --> W4
    SQS5 --> W5
    SQS6 --> W6
    SQS7 --> W7
    W1 & W2 & W3 & W4 & W5 & W6 & W7 -->|"upsert findings"| DDB
    W1 & W2 & W3 & W4 & W5 & W6 & W7 -->|"put metrics"| CW
    CW -->|"alarm breach"| SNS
    APIGW --> LAL & LAS & LAD
    LAL & LAS & LAD -->|"query / write"| DDB
    FE -->|"REST + API key"| APIGW
    DEV -->|"browser"| FE
```

---

## Daily Scan Sequence

```mermaid
sequenceDiagram
    participant EB as EventBridge
    participant ORC as Orchestrator Lambda
    participant SQS as SQS Queues (×7)
    participant W as Worker Lambdas (×7)
    participant EC2 as AWS EC2/RDS/EBS APIs
    participant DDB as DynamoDB
    participant CW as CloudWatch

    EB->>ORC: Scheduled trigger (02:00 UTC)
    ORC->>SQS: SendMessage to each of 7 queues (fan-out)
    SQS->>W: Triggers each worker concurrently
    W->>EC2: DescribeInstances / DescribeVolumes / etc.
    EC2-->>W: Resource list with utilization data
    W->>W: Evaluate idle/orphan/underutilized rules
    W->>DDB: PutItem (upsert finding with savings estimate)
    W->>CW: PutMetricData (findings count, savings USD)
    CW-->>CW: Evaluate alarm thresholds
    Note over W,DDB: Each worker runs independently in parallel
    Note over DDB: TTL=90 days on dismissed findings
```

---

## DynamoDB Single-Table Model

```mermaid
erDiagram
    FINDING {
        string pk "ACCOUNT#<accountId>"
        string sk "FINDING#<region>#<checkType>#<resourceId>"
        string gsi1pk "STATUS#active | STATUS#dismissed"
        string gsi1sk "SAVINGS#<zero-padded-cents>"
        string checkType "ec2-idle | ebs-orphan | eip-unassoc | etc."
        string resourceId "AWS resource ID"
        string region "us-east-1 | etc."
        string severity "low | medium | high"
        float monthlySavingsUsd "Estimated monthly savings"
        string status "active | dismissed"
        string metadata "JSON blob with resource details"
        number ttl "Unix timestamp (dismissed only)"
        string createdAt "ISO 8601"
        string updatedAt "ISO 8601"
    }

    GSI1 {
        string pk "gsi1pk — STATUS#<status>"
        string sk "gsi1sk — SAVINGS#<padded> (sort by savings desc)"
    }

    FINDING ||--o{ GSI1 : "projects to"
```

**Access patterns:**
| Pattern | Key |
|---------|-----|
| List all active findings sorted by savings | `GSI1: gsi1pk=STATUS#active`, scan index forward=false |
| Get single finding | `pk=ACCOUNT#<id>`, `sk=FINDING#<region>#<check>#<resource>` |
| Dismiss finding | Update `status`, set `gsi1pk=STATUS#dismissed`, set TTL |
| Summary by check type | Filter expression on `checkType` within GSI1 |

---

## CI/CD Pipeline

```mermaid
flowchart LR
    PR["Pull Request\nor push to main"]
    LINT_TF["lint-tf\nterraform fmt + validate\ntflint"]
    LINT_TS["lint-ts\neslint + tsc --noEmit"]
    TEST_TS["test-ts\nvitest + coverage ≥80%"]
    TF_VAL["tf-validate\nterraform validate"]
    SEC["security-scan\ncheckov + tfsec\nnpm audit"]
    FE_BUILD["frontend-build\nnpm run build"]
    DEPLOY["deploy.yml\nOIDC → AWS\nbundle → tf apply\nsmoke test"]

    PR --> LINT_TF & LINT_TS & TEST_TS & TF_VAL & SEC & FE_BUILD
    LINT_TF & LINT_TS & TEST_TS & TF_VAL & SEC & FE_BUILD -->|"all green\n+ push to main"| DEPLOY
```

- CI jobs run in parallel with a concurrency group (cancels stale runs on new push)
- Deploy uses **OIDC** — no long-lived AWS access keys stored in GitHub Secrets
- Each Lambda handler is bundled independently with esbuild (`--external:@aws-sdk/*`)

---

## AWS Services Reference

| Service | Usage | Reason |
|---------|-------|--------|
| **EventBridge** | Scheduled cron rule | Serverless cron, no EC2 needed, sub-minute precision |
| **Lambda** | Orchestrator + 7 workers + 3 API handlers | Fully managed compute, pay-per-invocation |
| **SQS** | Decoupling between orchestrator and workers | Retry, DLQ, back-pressure, independent scaling |
| **DynamoDB** | Single-table storage for findings | Single-digit ms latency, on-demand billing, TTL |
| **API Gateway** | HTTP API fronting Lambda | Managed auth (API key), throttling, CORS |
| **CloudWatch** | Custom metrics + alarms | Native AWS observability, EMF structured logs |
| **SNS** | Alarm breach notifications | Fan-out to email/Slack/PagerDuty |
| **S3 + CloudFront** | React dashboard hosting | Cheap, globally distributed, HTTPS |
| **SSM Parameter Store** | API key storage | Secrets managed outside code |
| **IAM** | Least-privilege roles per Lambda | Each function has only the permissions it needs |
| **GitHub Actions (OIDC)** | CI/CD without stored credentials | No long-lived keys, role assumed per workflow run |

---

## Architectural Decision Records

See [`docs/adr/`](docs/adr/) for the full rationale behind key design choices:

- [ADR-0001](docs/adr/0001-single-table-dynamodb.md) — Single-table DynamoDB design
- [ADR-0002](docs/adr/0002-worker-lambda-per-check.md) — One Lambda per check type
- [ADR-0003](docs/adr/0003-sqs-between-orchestrator-and-workers.md) — SQS as decoupling layer
- [ADR-0004](docs/adr/0004-api-key-vs-cognito.md) — API key over Cognito for this project
