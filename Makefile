.PHONY: help deploy destroy test lint localstack-up localstack-down terraform-validate install install-pre-commit

help: ## Show this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

localstack-up: ## Start LocalStack + seed AWS resources + run first scan
	docker compose -f docker-compose.localstack.yml up -d
	@echo "Waiting for LocalStack to be ready..."
	@sleep 5
	bash scripts/seed-localstack.sh
	@echo "LocalStack ready. Dashboard: http://localhost:5173"

localstack-down: ## Stop LocalStack
	docker compose -f docker-compose.localstack.yml down -v

test: ## Run unit and integration tests
	cd services && npm test
	cd frontend && npm test

lint: ## Run all linters (TS, Terraform)
	cd services && npm run lint
	cd frontend && npm run lint
	terraform -chdir=infra fmt -recursive -check

terraform-validate: ## fmt + validate + tflint + checkov + tfsec
	terraform -chdir=infra fmt -recursive
	terraform -chdir=infra init -backend=false
	terraform -chdir=infra validate
	@echo "Run tflint, checkov, tfsec separately if installed"

deploy: ## Deploy to AWS via Terraform (requires AWS credentials)
	@echo "Bundling Lambda handlers..."
	cd services && npm run build
	@echo "Applying Terraform..."
	terraform -chdir=infra apply -var-file=envs/dev.tfvars

destroy: ## Destroy AWS resources (use with caution)
	terraform -chdir=infra destroy -var-file=envs/dev.tfvars

install: ## Install all Node.js dependencies
	cd services && npm install
	cd frontend && npm install

install-pre-commit: ## Install pre-commit hooks
	pip install pre-commit
	pre-commit install
