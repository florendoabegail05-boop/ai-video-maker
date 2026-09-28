# WORK / CODEX — Draft Execution Ledger

Latest additive ChatGPT-side module: `draft-execution-ledger.mjs` + tests.

## Purpose
Track progress through the existing `draft-job-plan.mjs` without executing anything or weakening safety. This is metadata only.

## Verify locally
1. Pull latest `v2-clean-studio` without force-push.
2. Run:
   - `node --test v2/draft-execution-ledger.test.mjs`
   - full V2/bridge regression
   - existing smoke suites
3. Confirm no regression in real FFmpeg/FFprobe render tests.

## Integration guidance
If tests pass, consider a small Studio progress panel showing each planned job as Pending / Running / Done / Manual / Blocked / Optional.

Before any async provider result is applied, keep using the stricter operation-guard/current-state checks. The ledger alone is NOT authorization to apply a stale result.

When project revision or job shape changes, invalidate/refresh the ledger rather than silently reusing progress from an old plan.

Never silently reopen a completed job. A re-generation should create a fresh guarded operation or fresh ledger entry/state transition with explicit reason.

## Hard rules
- FREE ONLY default.
- No paid route enablement.
- No large downloads.
- No deletion or destructive cleanup.
- Preserve locked/imported media.
- No automatic upload/publish.
- Do not modify V1/main.
- No force push.

Update handoff with exact test counts and commit SHA after local verification.