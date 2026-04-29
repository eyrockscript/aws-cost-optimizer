# AWS Cost Optimizer Dashboard

> Sistema serverless que escanea una cuenta AWS, detecta recursos infrautilizados y expone los hallazgos en un dashboard con estimación de ahorro mensual.

**Estimación:** ~3 días · **Stack:** TypeScript (Lambda) + DynamoDB + EventBridge + CloudWatch + Terraform + React (dashboard)

---

## 1. Objetivo del proyecto

Demostrar competencias en:
- Diseño event-driven serverless en AWS
- Uso de la AWS SDK v3 (TypeScript) sobre múltiples servicios
- Modelado de single-table en DynamoDB
- IaC reproducible con Terraform
- Observabilidad (métricas custom + alarmas)
- Frontend ligero consumiendo una API autenticada

## 2. Casos de uso detectados

El sistema escanea periódicamente la cuenta AWS y detecta:

1. **EC2 idle**: instancias con CPU promedio < 5% durante 7 días
2. **EBS huérfanos**: volúmenes en estado `available` (sin attach) > 3 días
3. **Elastic IPs sin asociar**: EIPs sin `AssociationId`
4. **RDS sobreaprovisionados**: instancias con conexiones < 5 promedio en 7 días
5. **Snapshots viejos**: EBS/RDS snapshots > 90 días sin uso
6. **NAT Gateways de bajo tráfico**: < 1GB transferido en 7 días
7. **Lambda con memoria excesiva**: max memory used < 50% del configurado

Cada finding incluye: recurso, región, criterio, ahorro mensual estimado (USD), severidad, timestamp.

## 3. Arquitectura

```
EventBridge (cron diario 02:00 UTC)
        │
        ▼
┌────────────────────┐       ┌────────────────────┐
│  scanner-orchestr. │──────▶│  SQS (per-check)   │
│      Lambda        │       └─────────┬──────────┘
└────────────────────┘                 │
                                       ▼
                          ┌────────────────────────┐
                          │  Worker Lambdas (x7)   │
                          │  ec2-idle, ebs-orphan, │
                          │  eip, rds, snapshots,  │
                          │  nat-gw, lambda-mem    │
                          └────────────┬───────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                ▼                      ▼                      ▼
        ┌──────────────┐      ┌──────────────────┐    ┌─────────────┐
        │  DynamoDB    │      │  CloudWatch      │    │  SNS Topic  │
        │  (findings)  │      │  Custom Metrics  │    │  (alertas)  │
        └──────┬───────┘      └──────────────────┘    └─────────────┘
               │
               ▼
        ┌──────────────────┐         ┌──────────────────┐
        │  API Gateway     │◀────────│  React Dashboard │
        │  + api-handler λ │         │  (S3 + CF)       │
        └──────────────────┘         └──────────────────┘
```

**Decisiones clave:**
- **Worker por check** en vez de un único Lambda → escalan independientes, fallos aislados, métricas por check.
- **SQS entre orquestador y workers** → desacople, retries automáticos, DLQ.
- **DynamoDB single-table** → consultas eficientes por cuenta/región/tipo sin GSIs innecesarios.
- **Métricas custom** → permite alarmas tipo "ahorro potencial > $500" que disparan SNS.

## 4. Estructura del repositorio

```
aws-cost-optimizer/
├── README.md
├── ARCHITECTURE.md              # diagrama + ADRs (ver §13)
├── Makefile                     # tareas: deploy, destroy, test, lint
├── .editorconfig
├── .nvmrc                       # node 20
├── .tool-versions               # asdf: terraform 1.7.x, node 20
├── .pre-commit-config.yaml      # tf fmt, tflint, tfsec, eslint
├── .github/
│   ├── dependabot.yml           # npm + terraform + actions weekly
│   └── workflows/
│       ├── ci.yml               # lint + test + tf validate + checkov
│       └── deploy.yml           # OIDC → tf apply en push a main
│
├── infra/                       # Terraform
│   ├── main.tf
│   ├── variables.tf             # con validation blocks (ver §10)
│   ├── outputs.tf               # api_url, dashboard_url, sns_topic_arn
│   ├── providers.tf             # default_tags (ver §10)
│   ├── backend.tf               # S3 + DynamoDB lock (bootstrap aparte)
│   ├── envs/
│   │   ├── dev.tfvars
│   │   └── prod.tfvars
│   └── modules/
│       ├── lambda-function/     # módulo reutilizable (code, role, logs)
│       ├── dynamodb-findings/
│       ├── eventbridge-cron/
│       ├── sqs-with-dlq/
│       ├── api-gateway-http/
│       ├── frontend-hosting/    # S3 + CloudFront + OAC
│       └── github-oidc/         # rol para GitHub Actions sin keys
│
├── services/                    # Código TypeScript
│   ├── package.json             # con engines, repository, license
│   ├── tsconfig.json            # strict + noUncheckedIndexedAccess (§11)
│   ├── esbuild.config.mjs       # bundle por handler
│   ├── .eslintrc.json
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── orchestrator.ts
│   │   │   ├── checks/
│   │   │   │   ├── ec2-idle.ts
│   │   │   │   ├── ebs-orphan.ts
│   │   │   │   ├── eip-unassoc.ts
│   │   │   │   ├── rds-underutilized.ts
│   │   │   │   ├── snapshots-old.ts
│   │   │   │   ├── nat-gw-low-traffic.ts
│   │   │   │   └── lambda-overprovisioned.ts
│   │   │   └── api/
│   │   │       ├── list-findings.ts
│   │   │       ├── get-summary.ts
│   │   │       └── dismiss-finding.ts
│   │   ├── domain/
│   │   │   ├── finding.ts       # tipos + factory
│   │   │   ├── pricing.ts       # tabla de precios on-demand
│   │   │   └── severity.ts
│   │   ├── infra/
│   │   │   ├── ddb-client.ts    # singleton (§11)
│   │   │   ├── findings-repo.ts
│   │   │   └── metrics.ts       # PutMetricData wrapper
│   │   ├── schemas/             # Zod schemas para inputs API (§11)
│   │   │   ├── list-findings.ts
│   │   │   └── dismiss.ts
│   │   └── shared/
│   │       ├── logger.ts        # JSON estructurado (pino)
│   │       ├── errors.ts        # AppError + mapping a HTTP RFC 7807
│   │       └── aws-clients.ts   # singletons SDK v3
│   └── tests/
│       ├── unit/                # vitest
│       └── integration/         # con localstack
│
└── frontend/                    # React + Vite
    ├── package.json
    ├── src/
    │   ├── App.tsx
    │   ├── api/client.ts        # API key en header
    │   ├── components/
    │   │   ├── FindingsTable.tsx
    │   │   ├── SavingsChart.tsx     # recharts
    │   │   └── SeverityBadge.tsx
    │   └── pages/
    │       ├── Dashboard.tsx
    │       └── FindingDetail.tsx
    └── vite.config.ts
```

## 5. Modelo de datos (DynamoDB single-table)

**Tabla:** `cost-optimizer-findings`

| Atributo      | Tipo | Descripción                                    |
|---------------|------|------------------------------------------------|
| `pk`          | S    | `ACCOUNT#<account-id>`                         |
| `sk`          | S    | `FINDING#<region>#<check-type>#<resource-id>`  |
| `gsi1pk`      | S    | `STATUS#<active\|dismissed>`                   |
| `gsi1sk`      | S    | `SAVINGS#<zero-padded-monthly-usd>`            |
| `checkType`   | S    | `ec2-idle`, `ebs-orphan`, etc.                 |
| `resourceId`  | S    | ARN o ID nativo                                |
| `region`      | S    | `eu-west-1`                                    |
| `severity`    | S    | `low\|medium\|high`                            |
| `monthlySavingsUsd` | N | estimación calculada                          |
| `evidence`    | M    | métricas que justifican el finding             |
| `detectedAt`  | S    | ISO-8601                                       |
| `lastSeenAt`  | S    | ISO-8601 (refresh en cada scan)                |
| `dismissed`   | BOOL | flag manual desde el dashboard                 |
| `ttl`         | N    | epoch para auto-purga (90 días tras dismiss)   |

**GSI1**: lista findings activos ordenados por ahorro descendente (query principal del dashboard).

## 6. API REST (API Gateway HTTP API)

| Método | Path                              | Handler          | Descripción                      |
|--------|-----------------------------------|------------------|----------------------------------|
| GET    | `/findings`                       | list-findings    | filtros: `status`, `region`, `checkType`, `minSavings` |
| GET    | `/findings/{id}`                  | list-findings    | detalle con evidence completa    |
| GET    | `/summary`                        | get-summary      | totales agregados para el header |
| POST   | `/findings/{id}/dismiss`          | dismiss-finding  | marca como ignorado              |

Auth: API Key en header `x-api-key` (suficiente para portfolio; documentado en README que producción usaría Cognito o IAM — decisión consciente, ver ADR-004).

Errores siguen [RFC 7807 Problem Details](https://www.rfc-editor.org/rfc/rfc7807) con mapping centralizado en `shared/errors.ts`.

## 7. IAM y seguridad

- Cada worker Lambda tiene rol con **permisos read-only mínimos** del servicio que escanea (`ec2:Describe*`, `cloudwatch:GetMetricStatistics`, etc.).
- El orquestador solo puede `sqs:SendMessage` a las colas concretas.
- DynamoDB se accede vía rol con `Resource` apuntando al ARN exacto de la tabla + GSI.
- Cifrado: DynamoDB con KMS gestionado por AWS, S3 frontend con SSE-S3, secretos (API key) en SSM Parameter Store tipo SecureString.
- CloudFront con OAC (Origin Access Control) hacia el bucket S3, bucket privado.
- **Security scanning automatizado**: `checkov` y `tfsec` corren en CI sobre `infra/`. Failure si severity ≥ HIGH.
- `npm audit --audit-level=high` en CI.

## 8. Observabilidad

- **Logs**: JSON estructurado con `pino`, retención 14 días en CloudWatch Logs.
- **Métricas custom** (namespace `CostOptimizer`):
  - `FindingsDetected` (dim: `CheckType`)
  - `EstimatedMonthlySavings` (dim: `CheckType`)
  - `ScanDurationMs` (dim: `CheckType`)
  - `ScanErrors` (dim: `CheckType`)
- **Alarmas**:
  - Cualquier worker con `Errors > 0` en 5min → SNS
  - `EstimatedMonthlySavings` total > $500 → SNS (oportunidad relevante)
- **Dashboard CloudWatch** desplegado por Terraform con widgets de cada métrica.

## 9. Estimación de ahorros

Implementar `domain/pricing.ts` con tabla estática (por región) de precios on-demand para los recursos relevantes. Documentar en README que en producción se usaría AWS Pricing API. Para snapshots usar $0.05/GB-mes, EIP sin uso $0.005/h, NAT Gateway $0.045/h, etc.

## 10. Convenciones Terraform

**`providers.tf`** con `default_tags` aplicados a todos los recursos:

```hcl
provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project     = "cost-optimizer"
      Environment = var.environment
      ManagedBy   = "terraform"
      Repo        = "github.com/<user>/aws-cost-optimizer"
    }
  }
}
```

**`variables.tf`** con `validation` blocks:

```hcl
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "scan_schedule_cron" {
  type    = string
  default = "cron(0 2 * * ? *)"
  validation {
    condition     = can(regex("^cron\\(", var.scan_schedule_cron))
    error_message = "must be a valid EventBridge cron expression."
  }
}
```

**Outputs útiles** en `outputs.tf`: `api_url`, `dashboard_url`, `api_key_ssm_path` con instrucciones para recuperarla.

## 11. Convenciones TypeScript

**`tsconfig.json`** estricto:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

**Validación de input con Zod** en cada handler de la API:

```ts
// schemas/list-findings.ts
export const ListFindingsQuery = z.object({
  status: z.enum(["active", "dismissed"]).default("active"),
  region: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/).optional(),
  minSavings: z.coerce.number().min(0).optional(),
});

// handlers/api/list-findings.ts
const parsed = ListFindingsQuery.safeParse(event.queryStringParameters ?? {});
if (!parsed.success) return badRequest(parsed.error);
```

**Clientes SDK como singletons** fuera del handler (reutilización entre invocaciones):

```ts
// shared/aws-clients.ts
export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const cw = new CloudWatchClient({});
```

**Variables de entorno en Lambda**: `AWS_NODEJS_CONNECTION_REUSE_ENABLED=1` (mejora cold starts), `NODE_OPTIONS=--enable-source-maps`.

**Bundling con esbuild** por handler → zips < 500KB, cold starts más rápidos. Documentado en README con tabla de tamaños.

## 12. CI/CD

**Autenticación**: GitHub Actions usa **OIDC** contra AWS (rol con trust policy específica), **no** access keys. Rol IAM definido en `infra/modules/github-oidc/`.

**`ci.yml`** (cada PR):
- `terraform fmt -check` + `terraform validate` + `tflint` (con ruleset AWS)
- `checkov` y `tfsec` sobre `infra/`
- `npm ci` + `npm run lint` + `tsc --noEmit` + `npm test`
- `npm audit --audit-level=high`
- Coverage report con badge en README
- Concurrency group por PR (cancela runs anteriores)
- Cache de `node_modules` y `.terraform/`

**`deploy.yml`** (push a main):
- Asume rol vía OIDC
- Build de cada Lambda con esbuild
- `terraform apply -auto-approve` en dev
- Smoke test contra el endpoint

**Dependabot** (`.github/dependabot.yml`): updates semanales para npm, terraform y github-actions.

**Pre-commit hooks** (`.pre-commit-config.yaml`): `terraform fmt`, `tflint`, `tfsec`, `eslint --fix`. Documentado cómo instalar (`pre-commit install`).

## 13. Documentación (ARCHITECTURE.md)

Incluir 4 ADRs cortos (10-15 líneas cada uno):
- **ADR-001**: Single-table DynamoDB design (vs múltiples tablas)
- **ADR-002**: Worker Lambda por check (vs único Lambda con switch)
- **ADR-003**: SQS entre orquestador y workers (vs invocación directa async)
- **ADR-004**: API Key vs Cognito (decisión consciente para portfolio)

Diagrama de arquitectura en Mermaid (renderiza en GitHub) **y** versión Excalidraw exportada a PNG en `docs/architecture.png`.

## 14. Coste y limpieza

Sección **"Cost & cleanup"** en el README, bien visible:
- Coste estimado del entorno dev funcionando 24/7: ~$5/mes (DynamoDB on-demand + Lambda invocations + CloudWatch).
- **`make destroy`** funcional, testeado, documentado con un ejemplo claro.
- Aviso de que la API key se queda en SSM tras `destroy` si se configuró fuera de Terraform.

## 15. Plan de ejecución (3 días)

**Día 1 — Foundations**
- Setup repo (editorconfig, nvmrc, tool-versions, pre-commit, dependabot)
- esbuild, vitest, ESLint, Prettier, tsconfig estricto
- Módulos Terraform base (lambda-function, dynamodb, sqs-with-dlq)
- Módulo `github-oidc` para CI sin keys
- Handler del orquestador + 2 checks (ec2-idle, ebs-orphan) end-to-end con tests unitarios
- CI completa (lint + test + tf validate + checkov + tfsec)

**Día 2 — Workers + API**
- Resto de checks (5 más) con tests
- API Gateway + 4 handlers REST con validación Zod
- Errores RFC 7807
- Métricas custom + alarmas
- Tests de integración con LocalStack

**Día 3 — Frontend + pulido**
- React dashboard con tabla, filtros, gráfico recharts
- Despliegue S3 + CloudFront vía Terraform
- README con diagrama Mermaid, GIF demo, tabla de costes, instrucciones `make deploy`/`make destroy`, badges de CI/coverage
- ARCHITECTURE.md con los 4 ADRs

## 16. Cómo "venderlo" en el README

Estructura del README (en este orden):
1. Título + 1 línea con qué hace
2. Badge row: CI, coverage, license, terraform/node versions
3. Screenshot/GIF del dashboard
4. **What this demonstrates** en bullets:
   - Event-driven serverless architecture
   - Multi-service AWS SDK v3 with singleton clients
   - DynamoDB single-table design with GSI
   - Reusable Terraform modules with `default_tags` and validation blocks
   - Custom CloudWatch metrics and alarms
   - Least-privilege IAM
   - Security scanning in CI (checkov + tfsec + npm audit)
   - CI/CD with GitHub Actions using **OIDC** (no AWS keys)
   - Strict TypeScript + Zod input validation
   - RFC 7807 error responses
   - Real cost calculations against AWS pricing
5. Quickstart (`make deploy`)
6. Architecture (link a ARCHITECTURE.md + diagrama Mermaid)
7. Project structure (`tree` recortado)
8. Cost & cleanup
9. Trade-offs & decisions (link a ADRs)
10. License

Bloque destacado: "Estimated savings detected in my own AWS account: $XXX/month".
