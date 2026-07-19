# forms_runtime deployment

This app serves hosted and embedded forms without adding always-on load to the
DigitalOcean API host. The checked-in CDK is deployment configuration only:
real AWS/Cloudflare changes require the explicit approval gates in
`deploy/production/public-surface-hosting.md`.

## Local development

```powershell
pnpm.cmd --filter forms_runtime dev
```

Mock mode supports `http://localhost:3007/f/customer-feedback?projectId=project_mock`.
API mode requires an API base URL and a local 32+-character signing secret;
never use a production secret in local commands.

## Required production shape

- One CloudFront distribution with aliases **both** `forms.semblia.com` and
  `*.forms.semblia.com`.
- One ACM certificate in **`us-east-1`** whose SANs are exactly
  `forms.semblia.com` and `*.forms.semblia.com` (plus no tenant-specific
  certificate assumptions).
- The signing secret reaches Lambda only through a Secrets Manager **ARN**
  injection/reference. Do not place a raw secret in CDK context, shell history,
  templates, synth output, Git, or logs.
- Cloudflare DNS records and ACM validation records are DNS-only. No orange
  cloud/proxy sits between wildcard forms and CloudFront.
- `formsRuntimeCustomDomains` remains an intentional loud failure; this rollout
  covers only Semblia-managed exact/wildcard names.

## CDK commands (non-mutating synth)

```powershell
Push-Location apps/forms_runtime
pnpm.cmd build
pnpm.cmd cdk synth
Pop-Location
```

An approved API-mode deployment must pass only references/configuration, for
example a Secrets Manager ARN (not its value):

```powershell
# Illustrative placeholders only. Do not run deploy without approval.
pnpm.cmd cdk synth `
  -c formsRuntimeMode=api `
  -c formsRuntimeBaseDomain=forms.semblia.com `
  -c formsRuntimeApiBaseUrl=https://api.semblia.com/v2 `
  -c formsRuntimeSigningSecretArn=<secrets-manager-arn> `
  -c formsRuntimeCertificateArn=<us-east-1-acm-certificate-arn>
```

Inspect synth before any deploy: aliases must include the exact and wildcard
names; viewer-host forwarding/cache policies must be present; raw secret text
must be absent. See `cloudfront-notes.md` for the request-policy contract.

`pnpm.cmd build` is also a release gate: it imports the emitted Lambda ESM,
starts and probes the emitted local ESM in mock mode, and rejects a browser
bundle that contains React's development runtime. A TypeScript/esbuild success
without that artifact smoke is not sufficient deployment evidence.
