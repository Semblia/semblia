# How to Debug

## Method

1. **Reproduce before fixing.** Read the actual error output, not the
   pattern-match — a signal that looks like a known failure may have a
   different cause. No fix ships against an unreproduced symptom.
2. **Isolate the layer.** Decide whether the fault is UI, API contract,
   service, queue/worker, DB, or environment before editing anything.
   `git log` on the touched files and a diff against the last known-good
   commit beats speculation.
3. **Root cause, not symptom.** Before patching the function a ticket names,
   grep every caller. The correct fix is usually one guard in the shared path
   — patching only the reported call site leaves every sibling caller broken.
4. **Verify the fix by exercising the failing flow**, not just by
   typecheck/build. Then add the smallest regression check that would have
   caught it (see `testing.md`).
5. **Stuck after 2–3 genuinely different hypotheses?** Get a second diagnosis
   pass instead of thrashing: delegate to the Codex plugin
   (subagent `codex:codex-rescue`) with a fully self-contained brief.

## Known repo failure modes — check before deep-diving

- **Console Ninja (VS Code extension)** can overwrite `node_modules` entry
  files. Rule out corruption before diagnosing "impossible" ESM/CJS interop
  bugs: reinstall the package and retest.
- **Stale/corrupt `.next`** produces catch-all 404s and phantom server-side
  404s. Delete `.next` and restart the dev server before debugging routing.
- **Stale dev server**: server-side 404s on routes that exist on disk usually
  mean the dev server predates the file. Restart it first.
- **Framework behavior is version-sensitive.** Don't trust memory of Next.js
  defaults — check `node_modules/next/dist/docs/` (see `web-v2.md`).
