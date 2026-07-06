---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
---

# Testing Rules

- `web_v2` tests use **Vitest-native matchers** (`toBeTruthy`,
  `toBeDefined`, …) — jest-dom matchers are not installed; do not import or
  assume them.
- Every bug fix lands with the smallest regression check that would have
  caught it, in the same slice as the fix.
- Test behavior at the boundary (input → observable output), not internal
  implementation details; mock external services, not internal modules.
