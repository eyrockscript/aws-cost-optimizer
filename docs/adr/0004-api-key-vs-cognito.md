# ADR-0004: API Key Authentication Over Amazon Cognito

**Status:** Accepted  
**Date:** 2026-04-29

## Context

The React dashboard needs to authenticate against the API Gateway HTTP API to fetch and dismiss findings. The system is a single-user portfolio tool with no user registration, multi-tenancy, or OAuth flows required.

## Decision

Use an API key stored in SSM Parameter Store and passed as an `x-api-key` header. API Gateway validates the key natively without additional Lambda authorizer overhead.

## Alternatives Considered

- **Amazon Cognito User Pools**: Managed auth with JWT tokens, MFA, federation. Rejected for this project because there is only one user (the developer), no sign-up/sign-in UI is needed, and Cognito adds an always-on cost (~$0/month free tier, but with operational complexity: user pool setup, Cognito domain, refresh token rotation, JWT verification in Lambda authorizer).
- **Lambda Authorizer (custom JWT)**: Full control, but requires authoring and maintaining a separate authorizer Lambda with a shared secret or public key. Rejected — adds undifferentiated boilerplate that doesn't demonstrate a skill this project isn't already demonstrating.
- **IAM auth (SigV4)**: Best security posture for machine-to-machine. Rejected — requires AWS SDK in the browser or a signing proxy, which complicates the React dashboard unnecessarily for a portfolio demo.

## Consequences

- The API key is created by Terraform and stored in SSM as a SecureString.
- The dashboard reads the key from an environment variable at build time (injected by CI).
- The key is rotatable by updating the SSM parameter and redeploying.
- For a real multi-user product, Cognito or a third-party auth provider (Auth0, Clerk) would replace this pattern — this decision is documented so a future reviewer understands the intentional tradeoff.
