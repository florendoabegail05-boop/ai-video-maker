# Codex / Work — verify one-click status + release alignment

Pull the latest `v2-clean-studio` before editing. Do not touch `main`/V1. Preserve locked/imported media and FREE ONLY behavior.

## Focus
Verify the latest execution/status/release integration around:
- `v2/draft-execution-ledger.mjs`
- `v2/draft-execution-ledger.test.mjs`
- `v2/one-click-status-view.mjs`
- `v2/one-click-status-view.test.mjs`
- `v2/one-click-orchestrator.mjs`
- `v2/one-click-orchestrator.test.mjs`
- `v2/current-release-context.mjs`
- `v2/output-readiness-summary.mjs`
- `v2/final-verification-gate.mjs`

## Required checks
Run the focused tests first:

```bash
node --test v2/draft-execution-ledger.test.mjs v2/one-click-orchestrator.test.mjs v2/one-click-status-view.test.mjs v2/current-release-context.test.mjs v2/output-readiness-summary.test.mjs v2/final-verification-gate.test.mjs
```

Then run the full V2 + bridge regression:

```bash
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Then rerun the existing browser/smoke and real FFmpeg/FFprobe verification checks that have previously been used for this branch.

## Semantics to verify
1. OPTIONAL jobs do not depress the displayed creation progress denominator.
2. `draftExecutionSummary.complete` / `settled` means only that required jobs are no longer pending/running. It must NOT imply success.
3. `draftExecutionSummary.successful` / `readyForVerification` is true only when every required job is current and `DONE` or `SKIPPED`.
4. A ledger containing terminal `FAILED`/`BLOCKED`/`MANUAL` or stale required work cannot reach `VERIFY_OUTPUT`, rights review, owner approval, or manual-publish eligibility.
5. After creation successfully reaches `VERIFY_OUTPUT` with missing trusted final facts, the UI says `TECHNICAL VERIFICATION REQUIRED` / `RUN_FINAL_VERIFICATION`, not owner approval.
6. Known invalid final output remains `BLOCKED`.
7. A technical pass with incomplete project provenance advances to `RIGHTS REVIEW REQUIRED`.
8. Owner approval is accepted only through a complete, fresh `aivm-v2-owner-release-approval` record; arbitrary booleans must not bypass it.
9. If release inputs change after approval, status must return to owner approval required and clearly show stale approval.
10. Even when `manualPublishEligible === true`, `publishAuthorized` and `automaticPublishingAllowed` remain false.
11. No local file paths or private media details are exposed in the status model.

## Minimal integration target
If all focused tests and regression checks pass, wire the status model into the Studio's read-only one-click status panel using the four sections:
- Plan
- Create
- Verify
- Owner Review

Use `nextAction` from the status model for display guidance only. Do not let it directly execute providers, publish, upload, delete, overwrite, switch to paid routes, or download large models.

If any API mismatch is found, make the smallest reversible fix and add/adjust tests before integration. Record exact test counts and the final commit SHA.
