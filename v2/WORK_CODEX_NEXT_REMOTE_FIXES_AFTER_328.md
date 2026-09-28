# Codex / Work — reconcile remote pure-module fixes after the 328-test local integration

Resume from the preserved local workspace. Do not restart or discard the local one-click Studio integration that previously reached 328 passing tests and a real browser run ending correctly at Rights review required.

Before changing anything:
1. `git status`
2. preserve the current local changes/stash
3. fetch `origin/v2-clean-studio`
4. compare local and remote
5. reconcile non-destructively; do not reset, force-push, or touch main/V1

## Remote fixes added after the previous local integration run

### Revision-bound dependency scheduling
- `v2/job-dependency-scheduler.mjs`
- `v2/job-dependency-scheduler.test.mjs`

A plan/ledger project revision mismatch yields `project-revision-mismatch` and no jobs are schedulable. Preserve advisory-only behavior; it never authorizes execution or publishing.

### Unknown media facts stay unknown
- `v2/final-media-facts.mjs`

`null`, `undefined`, and blank numeric facts are no longer coerced to zero. Browser-observable fields may fill current trusted gaps while machine-only fields remain unknown.

### Retry failure classification survives retry limits
- `v2/job-retry-policy.mjs`
- `v2/job-retry-policy.test.mjs`
- `v2/one-click-retry-dispatch.mjs`
- `v2/one-click-retry-dispatch.test.mjs`

Classify failures before applying retry caps. Preserve conservative routing: capability/tool/workflow -> `REVIEW_BLOCKERS`; owner/login/CAPTCHA/payment/permission -> `OWNER_OR_MANUAL_INPUT_REQUIRED`; state drift -> `REPLAN`; transient retry-cap exhaustion -> `REVIEW_FAILURE`.

### Stale motion evidence keeps the specific generation-staleness reason
- `v2/one-click-media-commit.mjs`

When project state changed after motion dispatch and the result reports a different parent image, prefer `stale-generation:*`. On a current project, a wrong parent remains `motion-parent-mismatch`. Do not weaken exact source-image binding.

### Ledger result asset IDs survive metadata-only updates
- `v2/draft-execution-ledger.mjs`
- `v2/draft-execution-ledger.test.mjs`

Omitting `resultAssetIds` from `updateDraftJobState()` now preserves the current normalized list. An explicitly supplied array replaces it; an explicit empty array clears it. Preserve completed-job reopening guards and attempt semantics.

### Known-invalid technical values stay distinct from missing evidence
- `v2/final-verification-gate.mjs`
- `v2/final-verification-gate.test.mjs`
- `v2/output-readiness-summary.mjs`
- `v2/output-readiness-summary.test.mjs`

Keep these distinctions:
- zero/non-positive dimensions -> `dimensions-invalid`
- zero/non-positive duration -> `duration-invalid`
- required FPS present but invalid -> `fps-invalid`
- required codec/container evidence explicitly invalid -> hard invalid
- missing trusted evidence -> `TECHNICAL VERIFICATION REQUIRED`, not a false hard-failure claim

### Required codecs now cover audio-bearing renders correctly
- `v2/final-verification-gate.mjs`
- `v2/final-verification-gate.test.mjs`
- `v2/technical-verification-signature.mjs`
- `v2/technical-verification-signature.test.mjs`
- `v2/output-readiness-summary.mjs`

`requireCodecs:true` always requires trusted current video-codec evidence. If trusted current evidence verifies that an audio stream is present, it also requires trusted current audio-codec evidence. A verified silent render does not invent an audio-codec blocker. If audio-stream presence is unknown and audio is not otherwise required, audio codec remains informational until stream presence is established.

The technical verification stamp now binds `audioCodec` whenever codec verification is configured, so changing a verified audio codec changes the stamp and stale owner approval cannot remain current. Missing audio-codec evidence on a verified audio-bearing render makes the technical stamp ineligible. Explicit invalid trusted audio-codec evidence is classified as a hard technical blocker; missing evidence remains verification-required.

### Owner release approval is bound to complete provenance metadata
- `v2/asset-provenance.mjs`
- `v2/asset-provenance.test.mjs`
- `v2/release-approval.mjs`
- `v2/release-approval.test.mjs`
- `v2/verified-release-approval.test.mjs`

Release signatures include normalized origin, rights status, source label, credit and provenance note. Changes after approval make legacy and verified release approvals stale.

### Portable provenance and publishing metadata do not leak local labels
- `v2/asset-provenance.mjs`
- `v2/asset-provenance.test.mjs`
- `v2/publishing.mjs`
- `v2/publishing.test.mjs`

Safe source labels and credits may remain portable. Path-like source labels become `null`. Asset display names are reduced to a portable basename when an internal name contains a path/URL. Internal provenance notes, local source paths, private prompts, bridge/output paths, media bytes, and publish authority remain excluded.

### Final-output provider labels are portable only
- `v2/final-output.mjs`
- `v2/final-output.test.mjs`

Keep simple labels such as `ffmpeg` or `bridge-local`; strip local executable paths, absolute paths and URL-like provider values.

### Saved final-verification snapshots are whitelist-only portable metadata
- `v2/publishing.mjs`
- `v2/publishing.test.mjs`
- `v2/publishing-portability-regression.test.mjs`
- `v2/final-verification-integrity.test.mjs`

`setFinalVerification()` stores only known portable verification fields, sanitizes timestamps/provider/issues, and rejects internally inconsistent `verified:true` records. On read/export, old imported snapshots are re-sanitized; current-signature snapshots with inconsistent facts become `verification-facts-inconsistent` and are not exported as verified.

### Owner approval refresh reasons are explicit in the status view
- `v2/one-click-status-view.mjs`
- `v2/one-click-status-view.test.mjs`

Presentation distinguishes release metadata/provenance changes, render-input changes, changed trusted technical evidence, missing current machine verification, missing technical-verification signature, legacy approval records and incomplete owner confirmations. Publishing remains manual.

## Required focused rerun after reconciliation

```bash
node --test \
  v2/draft-execution-ledger.test.mjs \
  v2/job-dependency-scheduler.test.mjs \
  v2/final-media-facts.test.mjs \
  v2/final-verification-gate.test.mjs \
  v2/technical-verification-signature.test.mjs \
  v2/output-readiness-summary.test.mjs \
  v2/job-retry-policy.test.mjs \
  v2/job-failure-classifier.test.mjs \
  v2/one-click-media-commit.test.mjs \
  v2/one-click-dispatch-envelope.test.mjs \
  v2/one-click-result-processor.test.mjs \
  v2/one-click-retry-dispatch.test.mjs \
  v2/asset-provenance.test.mjs \
  v2/release-approval.test.mjs \
  v2/verified-release-approval.test.mjs \
  v2/publishing.test.mjs \
  v2/publishing-portability-regression.test.mjs \
  v2/final-verification-integrity.test.mjs \
  v2/final-output.test.mjs \
  v2/one-click-status-view.test.mjs
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

When finished, commit/push the reconciled local integration plus these remote fixes and report exact focused/full test counts, browser/FFmpeg/FFprobe result, files changed, remaining genuine blockers, and final remote SHA.
