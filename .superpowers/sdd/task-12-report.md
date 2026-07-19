# Task 12 Report

## Delivered

- Runtime signing credentials are raw-secret only for local API execution and ARN-only for deployed API Lambda execution. Deployed secrets load from Secrets Manager once per ARN, validate in memory, and never retain the ARN in the resolved runtime environment.
- Lambda initialization is lazy and returns an opaque private/no-store 503 when initialization fails. Mock mode remains secret-free.
- The CDK stack passes a secret ARN only, grants scoped read access, requires an API certificate in us-east-1, and derives exact plus wildcard forms aliases.
- CloudFront overwrites original-host metadata, strips viewer trust headers, keys tenant HTML by the generated host header, forwards all query strings to origin, and caches only reviewed query variants.

## Verification

- Focused runtime-secret/stack tests passed.
- Full forms-runtime tests, typecheck, lint, build, CDK synth, and raw-secret synth scan were run during the checkpoint.
