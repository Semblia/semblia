---
paths:
  - "apps/web_v2/**"
---

# apps/web_v2 — Next.js App

- Call `apps/api_v2` endpoints only, always under `/v2/`. Legacy endpoints do
  not exist anymore.
- Next.js 16: in routes/layouts, `params` is a Promise — always
  `await props.params`.
- Framework behavior is version-sensitive: when uncertain, check the shipped
  docs in `node_modules/next/dist/docs/` instead of trusting memory.
- Every new route section adds an `error.tsx` delegating to the shared
  `RouteError` component.
- API enum → union maps must end with `?? FALLBACK` — the API can grow enum
  values before the web app does.
- Clerk: render `<SignOutButton />` bare — never wrap it with JSX children;
  configure via props.

## Verification commands

```bash
cd apps/web_v2 && pnpm exec tsc --noEmit
cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx
pnpm build --filter web_v2
```
