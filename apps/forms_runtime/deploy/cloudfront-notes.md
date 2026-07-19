# CloudFront policy

CloudFront terminates TLS for both `forms.semblia.com` and
`*.forms.semblia.com` using an ACM certificate in `us-east-1`. It forwards to
the Lambda Function URL with Origin Access Control. The exact service host
never selects a default tenant.

## Host and cache isolation

The origin keeps its Lambda Function URL `Host` for OAC. A CloudFront Function
copies the viewer host to `x-semblia-original-host`; the runtime uses that
header first and `Host` only for local/direct tests. The request/cache policy
must include the original host so warmed alpha content cannot appear on beta.

- Cache only `GET`/`HEAD`; never cache `POST`.
- HTML may use `public, s-maxage=60, stale-while-revalidate=300` only with
  original-host plus `projectId` and `submitted` query isolation. The origin
  request policy forwards all query parameters; wildcard routing never treats
  `projectId` as authority even though it remains available to the exact-host
  compatibility branch.
- Do not forward cookies or add a broad wildcard browser CORS grant.
- Forward raw request body and only the required content/trust headers on
  submit: `content-type`, `origin`, `x-semblia-original-host`,
  `x-semblia-original-user-agent`, `x-semblia-original-forwarded-for`,
  and `idempotency-key`. The viewer-request function deletes caller-supplied
  Semblia signature/runtime headers and overwrites the three `original-*`
  values from the actual viewer request; viewer trust material is never
  forwarded as runtime authority.

## Authority boundaries

Wildcard host resolution is authoritative. `projectId` must be ignored/rejected
on wildcard requests; the parameter is limited to the exact-host legacy
compatibility branch. Runtime signatures bind timestamp, method, full
path/query, viewer host, and exact raw bytes. Signature failure returns `401`
with a request id in safe telemetry and never falls back to Origin.

Unknown/disabled/retired/wrong-feature hosts and cross-project slugs are opaque
`404`; resolver unavailability is `503`. Forms emit `X-Robots-Tag: noindex`
and noindex metadata. Future static assets need content hashes and immutable
caching; keep HTML separately host-isolated.
