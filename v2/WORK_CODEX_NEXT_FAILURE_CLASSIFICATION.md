# WORK / CODEX NEXT — Structured Failure Classification

## Goal
Verify the new structured failure classification and retry safety path before wiring it into the live Studio executor.

## Files
- `v2/job-failure-classifier.mjs`
- `v2/job-failure-classifier.test.mjs`
- `v2/job-retry-policy.mjs`
- `v2/job-retry-policy.test.mjs`
- `v2/one-click-result-processor.mjs`
- `v2/one-click-result-processor.test.mjs`

## Required local verification
1. Run the focused tests above.
2. Run the scheduler, ledger, result-gate, dispatch, media-commit, generation-input-guard and orchestrator tests.
3. Run the full V2 + local-bridge regression suite.
4. Keep V1/main untouched.

## Behavior that must remain true
- `TRANSIENT` failures may be retry-eligible only within the conservative attempt cap.
- Retry is never automatic.
- Paid/payment/login/CAPTCHA/permission/owner-action failures require owner/manual action.
- Stale/project/scene/render/generation-input changes require replan.
- Missing capability/tool/workflow/model failures are blockers, not retry loops.
- Retry discovery refuses plan/ledger project mismatch and project-revision mismatch.
- Every retry must capture fresh operation and generation-input guards.
- No provider switching to paid routes.
- No file deletion or destructive replacement.
- No private-media upload.
- No automatic publishing.

## Integration guidance
Prefer explicit executor failure codes (`code`, `errorCode`, or `reasonCode`) when available, with text as a conservative fallback. Do not weaken the classification to make a failed job continue automatically. If a local adapter exposes a more precise stable failure code, map it into these categories instead of adding fragile UI string checks.

## UI suggestions
Use small factual states such as:
- `Retry eligible`
- `Owner action required`
- `Replan required`
- `Capability required`
- `Review failure`

Do not describe retry eligibility as success, and do not equate a completed ledger with a successful video when failed jobs exist.
