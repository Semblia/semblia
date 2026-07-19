# Public-surface hosting activation runbook

Status: **plan only.** Nothing in this file authorizes provider, DNS, database,
or deployment mutation. There is no extra domain purchase: the existing
`semblia.com` zone is the only domain assumed.

## Explicit approval gates

1. A user approves the target environment, operator, deployed commit, and
   maintenance window in writing.
2. An operator records a clean, reviewed double dry-run backfill and approves
   its sanitized results before a single `--apply`.
3. A separate reviewed artifact supplies the absent contract migration only
   after the audit reports zero blocking conflicts.
4. The user separately approves AWS, Cloudflare, and Vercel mutations and the
   final DNS cutover. Do not infer this from source-code approval.

## Forms: ACM, secret injection, CloudFront, and Cloudflare

1. Request/import the ACM certificate in **`us-east-1`**. Its required SANs
   are exactly `forms.semblia.com` and `*.forms.semblia.com`.
2. Add the certificate's provider-reported DNS validation records to the
   authoritative Cloudflare zone as **DNS-only** records. Capture the actual
   names/targets from ACM; never substitute guesses.
3. Store the runtime signing secret in AWS Secrets Manager. Pass only the
   secret ARN to the deployment configuration/Lambda reference; inspect the
   generated template and logs to prove the raw value is absent.
4. Synthesize then deploy the reviewed CloudFront distribution with aliases
   `forms.semblia.com` and `*.forms.semblia.com`, the us-east-1 certificate,
   OAC, original-host forwarding, host cache-key isolation, POST uncached, and
   no cookie forwarding.
5. Create Cloudflare **DNS-only** exact and wildcard records pointing to the
   CloudFront distribution domain reported by AWS:

   ```text
   forms.semblia.com       CNAME <cloudfront-domain-reported-by-aws>
   *.forms.semblia.com     CNAME <cloudfront-domain-reported-by-aws>
   ```

   Use the actual distribution domain; placeholders are intentionally not
   executable values. Keep certificate-validation records DNS-only too.

## Walls: Vercel and Cloudflare

Before changing DNS, use the approved Vercel project/team to request/inspect
the exact `walls.semblia.com` and wildcard `*.walls.semblia.com` domains. Copy
the **provider-reported** required record type/name/value and any ACME/CNAME
delegation challenge exactly into the change record. Do not invent values; use
these read-only capture commands after authorization:

```powershell
vercel domains inspect "walls.semblia.com" --scope <team>
vercel domains inspect "*.walls.semblia.com" --scope <team>
```

Create only the reported exact/wildcard routing records and challenges in
Cloudflare as DNS-only. Assign both domains to `web_v2`; the exact wall service
host must remain non-tenant. Record the Vercel verification result before
cutover.

## Activation sequence and proof

1. Deploy compatible expand-state API/forms/web code while shared legacy URLs
   remain valid. Confirm the contract migration directory is absent.
2. In the approved target, run backfill dry-run twice and review sanitized
   counts; run apply only after gate 2, then rerun it to prove `changed=0`.
3. Complete the separately approved contract migration artifact only after its
   dedicated integration proof passes.
4. Create/verify ACM, CloudFront, Vercel, and DNS bindings under gate 4.
5. Build and smoke the emitted forms artifacts (`pnpm.cmd --filter
   forms_runtime build`) and an optimized `web_v2` production server. Do not use
   `next dev` response headers as production cache proof; Next deliberately
   applies development cache behavior there.
6. Run `scripts/verify-public-hosting.ps1` with two tenants sharing one form
   slug. Supply a beta-only hostile slug and a known-valid exact-host project id
   so the strict branches are exercised. The verifier disables redirects and
   requires opaque unknown/exact-host `404`s, tenant-distinct bodies, no cookies,
   forms noindex, security headers, wall no-store, canonical/Open Graph/JSON-LD,
   robots, sitemap, and direct-internal-route rejection. Example shape:

   ```powershell
   .\scripts\verify-public-hosting.ps1 `
     -FormsBaseUrl <approved-forms-origin> `
     -WallsBaseUrl <approved-walls-origin> `
     -AlphaFormsHost <alpha.forms.semblia.com> `
     -BetaFormsHost <beta.forms.semblia.com> `
     -AlphaWallsHost <alpha.walls.semblia.com> `
     -BetaWallsHost <beta.walls.semblia.com> `
     -SharedFormSlug <shared-form-slug> `
     -AlphaWallSlug <alpha-additional-wall-slug> `
     -BetaWallSlug <beta-wall-slug> `
     -HostileFormSlug <beta-only-form-slug> `
     -ExactProjectId <alpha-project-id>
   ```

7. In a headed browser, navigate alpha then beta in the same fresh session for
   both forms and walls. Verify distinct content, metadata, zero Clerk resources
   or cookies, clean console/page errors, and one synthetic disposable form
   submission before deleting its test data.
8. Verify provider logs contain safe resolver/canonical/alias/cross-project/
   signature/exact-host/missing-primary events and no payload/signature fields.
9. Only then, in the activation artifact, switch generated client URLs and
   canonical metadata to API-issued immutable project hosts. Their labels were
   derived from the creation-time project slug; never reconstruct them from the
   current mutable slug.

## Rollback and expand/contract boundary

Roll back traffic first: remove/revert the exact/wildcard routing bindings and
restore legacy generated links if they were switched. Keep the expand data,
tombstones, and any reviewed contract constraints; do not down-migrate durable
identities or delete host rows. An older binary must remain compatible with the
expand state. This artifact has only the expand migration and no contract
migration, provider mutation, or client URL switch.
