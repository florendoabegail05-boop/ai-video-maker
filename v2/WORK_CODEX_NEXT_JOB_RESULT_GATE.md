# Work/Codex Next — Guarded Draft Job Results

Chat added `job-result-gate.mjs` and `job-result-gate.test.mjs` as additive, non-live integration work.

## Purpose
Before an async generation/render result is accepted into draft progress, re-check that it still belongs to the current project state.

## Local verification
Run:

```bash
node --test v2/job-result-gate.test.mjs
```

Then run the full V2/bridge suite and smoke tests.

## Integration guidance
- Scene image/motion jobs may allow unrelated project revisions only if the guarded scene itself is unchanged.
- Final assembly/verification must require the current render signature to match.
- Reject results when the ledger entry is stale or no longer RUNNING.
- Reject result asset IDs not present in the current project metadata.
- Do not apply a generated result over locked media.
- Result acceptance currently updates progress metadata only; actual file/asset application must remain a separate non-destructive operation.
- A rejected stale result must not delete the generated file. Keep it available for owner recovery/import if practical.
- Preserve any stricter existing checks in `studio.mjs` or bridge code.

## Rules
FREE ONLY by default. No paid providers, force-push, admin changes, V1/main changes, private uploads, model downloads, destructive cleanup, or silent replacement of locked/imported media.
