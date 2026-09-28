# Work/Codex Next — Draft Job Retry Policy

New additive files:
- `job-retry-policy.mjs`
- `job-retry-policy.test.mjs`

## Verify locally

1. Pull/fetch latest `v2-clean-studio` without force-push.
2. Run:
   - `node --test v2/job-retry-policy.test.mjs`
   - relevant scheduler/ledger/result-gate tests
   - full V2/bridge regression
3. Preserve stricter existing behavior if live executor logic is already safer.

## Intended integration

Use this only after a guarded job result is marked FAILED. It is a conservative advisory policy, not an auto-retry loop.

Rules to preserve:
- retry only FAILED entries that are not stale;
- respect per-type attempt caps;
- paid/billing/login/CAPTCHA/permission/owner-approval failures are never retried automatically;
- stale/project/scene/render-state failures require replanning and a fresh guard, not blind retry;
- every retry must capture a fresh operation guard;
- FREE ONLY route must still be verified at retry time;
- never delete a failed output merely because metadata rejects it;
- never overwrite locked/imported media;
- no automatic publishing or uploads.

If integrated into Studio, a safe UI is `Retry eligible` / `Owner action required` / `Replan required`, with no silent background retries.
