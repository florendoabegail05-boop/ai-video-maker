# Codex / Work — reconcile remote pure-module fixes after the 328-test local integration

Resume from the preserved local workspace. Do not restart or discard the local one-click Studio integration that previously reached 328 passing tests and a real browser run ending correctly at Rights review required.

Before changing anything:
1. `git status`
2. preserve the current local changes/stash
3. fetch `origin/v2-clean-studio`
4. compare local and remote
5. reconcile non-destructively; do not reset, force-push, or touch main/V1

## Remote fixes added after the previous local integration run

The remote branch now contains additional pure-module safety fixes that should be kept when reconciling:

### Revision-bound dependency scheduling
- `v2/job-dependency-scheduler.mjs`
- `v2/job-dependency-scheduler.test.mjs`

A plan/ledger project revision mismatch now yields `project-revision-mismatch` and no jobs are schedulable. `draftScheduleSummary` exposes `valid`, `reason`, and both revisions. This is advisory only and still never authorizes execution or publishing.

### Unknown media facts stay unknown
- `v2/final-media-facts.mjs`

`null`, `undefined`, and blank numeric facts are no longer coerced to zero. Preserve the existing tests where browser width/height/duration may fill current trusted gaps while machine-only fields remain unknown.

### Retry-limit decisions preserve the real failure class
- `v2/job-retry-policy.mjs`
- `v2/job-retry-policy.test.mjs`

Failure classification now occurs before applying the transient retry cap. A transient failure at the cap is still `retry-limit-reached` but retains its failure classification. Non-retryable owner/payment/capability/replan failures must keep their real reason even if the attempt counter is already at the cap.

### Retry dispatcher preserves classified blocker actions
- `v2/one-click-retry-dispatch.mjs`
- `v2/one-click-retry-dispatch.test.mjs`

When retry is denied, keep conservative failure routing from the classifier. Missing capability/tool/workflow failures must surface `REVIEW_BLOCKERS`; owner/login/CAPTCHA/payment/permission failures must surface `OWNER_OR_MANUAL_INPUT_REQUIRED`; state drift must surface `REPLAN`. A transient failure that simply exhausted its retry cap stays `REVIEW_FAILURE` and must not become retry-eligible again.

### Stale motion parent evidence gets the more specific generation-staleness result
- `v2/one-click-media-commit.mjs`

When the project changed after motion dispatch and the executor result reports a different parent image, prefer `stale-generation:*` over a generic `stale-dispatch:*` result. On an otherwise current project, simply naming a different parent still remains `motion-parent-mismatch`. Do not weaken the exact guarded source-image requirement.

## Required focused rerun after reconciliation

```bash
node --test \
  v2/job-dependency-scheduler.test.mjs \
  v2/final-media-facts.test.mjs \
  v2/job-retry-policy.test.mjs \
  v2/job-failure-classifier.test.mjs \
  v2/one-click-media-commit.test.mjs \
  v2/one-click-dispatch-envelope.test.mjs \
  v2/one-click-result-processor.test.mjs \
  v2/one-click-retry-dispatch.test.mjs
```

Then rerun the full regression:

```bash
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Also rerun the existing browser/smoke, FFmpeg and FFprobe checks after the local Studio integration is reconciled.

## Preserve the already verified behavior
- FREE ONLY
- no paid fallback
- no large automatic model downloads
- no overwrite/delete of locked or imported media
- exact motion source binding
- stale results require replan/review, not silent acceptance
- successful creation -> technical verification -> rights review -> verified owner release approval -> manual publish only
- `publishAuthorized:false`
- `automaticPublishingAllowed:false`

The previous real browser result ending at **Rights review required** after successful final verification was correct and must remain correct.

When finished, commit/push the reconciled local integration plus these remote fixes and report exact focused/full test counts, browser/FFmpeg/FFprobe result, files changed, and final remote SHA.
