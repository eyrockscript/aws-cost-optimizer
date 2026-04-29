# Contributing

## Prerequisites

- Node.js 20 (use `.nvmrc` via `nvm use`)
- Terraform 1.7.x
- Docker (for LocalStack integration tests)
- AWS CLI + `awslocal` (for seed scripts)
- `gh` CLI (for repo operations)

## Development Setup

```bash
# Install service dependencies
cd services && npm install

# Install frontend dependencies
cd frontend && npm install

# Start LocalStack for integration tests
make localstack-up
```

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

<optional body>

<optional footer>
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | New check type, new API endpoint, new dashboard feature |
| `fix` | Bug in check logic, incorrect savings calculation, UI bug |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `docs` | Documentation updates |
| `chore` | Dependency updates, config, build changes |
| `ci` | GitHub Actions workflow changes |
| `perf` | Performance improvements |

**Examples:**
```
feat(checks): add lambda-overprovisioned check
fix(pricing): correct NAT gateway hourly rate for eu-west-1
docs(adr): add ADR-0005 for CloudFront cache strategy
```

## Branch Strategy

- `main` — protected, CI required, auto-deploys to dev
- `feat/<name>` — feature branches, open PR to main
- `fix/<name>` — bug fix branches

## Running Tests

```bash
# Unit tests only (no Docker needed)
cd services && npm test

# Integration tests (requires LocalStack running)
cd services && npm run test:integration

# Frontend component tests
cd frontend && npm test

# All tests + coverage report
make test
```

## Linting

```bash
# TypeScript linting
cd services && npm run lint

# Terraform formatting check
terraform -chdir=infra fmt -recursive -check

# Full lint pass
make lint
```

## Pre-commit Hooks

Install pre-commit:
```bash
pip install pre-commit
pre-commit install
```

Hooks configured in `.pre-commit-config.yaml`:
- `terraform fmt` — format Terraform files
- `tflint` — Terraform linting
- `eslint` — TypeScript linting
- `prettier` — code formatting

## Adding a New Check

1. Create `services/src/handlers/checks/<name>.ts`
2. Add IAM permissions in `infra/modules/lambda-function/` for the new Lambda's role
3. Add SQS queue + event source mapping in `infra/main.tf`
4. Register the queue URL in the orchestrator's environment variables
5. Add pricing entry in `services/src/domain/pricing.ts`
6. Write unit tests in `services/tests/unit/checks/<name>.test.ts`
7. Update `ARCHITECTURE.md` and `docs/cost-model.md`

## Terraform

```bash
# Validate all Terraform
make terraform-validate

# Plan changes (requires AWS credentials)
terraform -chdir=infra plan -var-file=envs/dev.tfvars

# Security scan
checkov -d infra/
tfsec infra/
```
