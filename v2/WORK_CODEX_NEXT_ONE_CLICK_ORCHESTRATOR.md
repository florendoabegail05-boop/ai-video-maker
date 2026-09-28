# Work/Codex next: one-click orchestrator

Pull the latest `v2-clean-studio` branch before editing. Chat added a low-conflict pure orchestration module that combines the existing draft plan, execution ledger, scheduler and output-readiness flow without running providers itself.

## Verify

Run:

```bash
node --test v2/one-click-orchestrator.test.mjs
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Then rerun the existing browser/smoke and real FFmpeg/FFprobe checks used by the V2 handoff.

## Inspect before integration

Review `v2/one-click-orchestrator.mjs` together with:
- `draft-job-plan.mjs`
- `draft-execution-ledger.mjs`
- `job-dependency-scheduler.mjs`
- `job-result-gate.mjs`
- `job-retry-policy.mjs`
- `final-verification-gate.mjs`
- `output-readiness-summary.mjs`

If behavior is sound, wire a minimal live Studio action/panel that can:
1. create a current one-click session,
2. show the next guarded job,
3. execute only through already-verified FREE ONLY live routes,
4. update the existing ledger only after guarded result acceptance,
5. replan when project/revision/current render state changes,
6. stop for manual/import/owner-required actions,
7. move to final verification only after execution is complete.

## Hard safety rules

- Do not enable paid providers or billing-capable modes.
- Do not download large models automatically.
- Do not overwrite locked/imported media.
- Do not delete rejected/stale generated files automatically.
- Do not upload private media automatically.
- Do not publish automatically.
- Keep `publishAuthorized:false` unless a separate explicit owner-controlled publish action is invoked by the owner.
- Preserve stricter existing behavior if this module disagrees with a live guard.
- Main/V1 stays untouched.

Update the handoff with exact test counts, smoke results, local integration status and commit SHA. If any test or live check fails, fix conservatively and rerun before pushing.
