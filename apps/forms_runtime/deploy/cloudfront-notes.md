# CloudFront policy

CloudFront terminates TLS for `*.collect.tresta.app` and forwards requests to the Lambda Function URL origin.

## Original host

The Lambda Function URL must keep its own origin `Host` header for Origin Access Control. A CloudFront Function copies the viewer hostname into:

```text
x-tresta-original-host
```

`forms_runtime` resolves projects from that header first, then falls back to `Host` for local development and direct tests.

## GET and HEAD

- Cache only `GET` and `HEAD`.
- Use origin response caching: `public, s-maxage=60, stale-while-revalidate=300`.
- Include `x-tresta-original-host` in the cache key.
- Forward query strings so `?submitted=1` and future preview/debug flags are preserved.
- Do not forward cookies for the hosted forms runtime.

## POST submissions

- Allow all methods on the default behavior so form submissions can reach Lambda.
- Do not cache `POST`.
- Forward request body, `content-type`, and `x-tresta-original-host`.
- Keep canonical validation, idempotency, submission writes, analytics, and notification fanout in `api_v2`.

## Future static assets

If the hosted renderer gets dedicated static assets, serve content-hashed filenames with long immutable cache headers. Keep uncached or short-cache HTML separate from long-cache assets.
