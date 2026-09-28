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

### Ledger result asset IDs survive metadata-only updates
- `v2/draft-execution-ledger.mjs`
- `v2/draft-execution-ledger.test.mjs`

`updateDraftJobState()` no longer clears an existing `resultAssetIds` list merely because a caller updates state/message metadata without supplying a `resultAssetIds` field. Omission means preserve the current normalized IDs; an explicitly supplied array still replaces the list, and an explicit empty array clears it. This prevents post-registration/status-only updates from silently forgetting which assets a completed job produced.

Keep the existing completed-job reopening guard and attempt semantics unchanged.

### Known-invalid technical values are distinct from missing evidence
- `v2/final-verification-gate.mjs`
- `v2/final-verification-gate.test.mjs`
- `v2/output-readiness-summary.mjs`
- `v2/output-readiness-summary.test.mjs`

The final technical gate now distinguishes unknown from known-invalid media values:
- zero/non-positive dimensions -> `dimensions-invalid`
- zero/non-positive duration -> `duration-invalid`
- required FPS present but invalid -> `fps-invalid`
- required codec/container evidence that is explicitly invalid remains a hard invalid condition

These known-invalid facts must produce output readiness `BLOCKED`, not `TECHNICAL VERIFICATION REQUIRED`. By contrast, truly missing trusted facts (for example required FPS is `null`) remain `TECHNICAL VERIFICATION REQUIRED` so the UI tells the owner to verify rather than incorrectly implying the render is definitely bad.

### Owner release approval is bound to complete provenance metadata
- `v2/asset-provenance.mjs`
- `v2/asset-provenance.test.mjs`
- `v2/release-approval.mjs`
- `v2/release-approval.test.mjs`
- `v2/verified-release-approval.test.mjs`

Release signatures now include each asset's normalized provenance origin, rights status, source label, credit, and provenance note. A source-label, origin, rights, credit, or provenance-note change after owner approval must make both legacy and verified release approvals stale even when the render itself has not changed.

`provenanceAudit` keeps the normalized source label and internal provenance note so release signing can see them.

### Portable provenance and publishing metadata do not leak path-like asset labels
- `v2/asset-provenance.mjs`
- `v2/asset-provenance.test.mjs`
- `v2/publishing.mjs`
- `v2/publishing.test.mjs`

The portable provenance summary preserves safe human-readable source labels and credits, but local path-like source labels are replaced with `null`. Asset display names are also sanitized through `portableAssetName`: Windows paths, Unix paths, `file:` URLs and URL-like names keep only a portable basename. The same sanitizer is used by `makePublishingPackage()` so an asset whose internal name accidentally contains `C:\\Users\\...` cannot copy that local path into the portable package.

Internal provenance notes remain excluded. The package must continue excluding project prompts, local source paths, private provenance notes, bridge/output paths, media bytes, and automatic publish authority.

### Final-output provider labels are portable only
- `v2/final-output.mjs`
- `v2/final-output.test.mjs`

`makeFinalOutputManifest()` now keeps simple provider labels such as `ffmpeg` or `bridge-local`, but drops provider/encoder values that look like local executable paths, absolute paths or URL-like values. This keeps the manifest's existing promise that local paths and bridge URLs are excluded.

### Saved final-verification snapshots are whitelist-only portable metadata
- `v2/publishing.mjs`
- `v2/publishing.test.mjs`
- `v2/publishing-portability-regression.test.mjs`

`setFinalVerification()` no longer copies arbitrary nested `expected`, `actual`, issue-message, timestamp or provider data from a caller-supplied verification object. It stores only the known portable technical fields, normalizes the timestamp, replaces issue messages with code-based safe text, caps issue count, and sanitizes provider labels.

`makePublishingPackage()` and `finalVerificationStatus()` also re-sanitize already-saved verification snapshots on read/export. This matters for older imported backups: even if a historical snapshot contains a local path/URL/private nested field, a current portable publishing package must not echo it merely because the render signature is still fresh.

### A `verified:true` flag cannot override inconsistent final-output facts
- `v2/publishing.mjs`
- `v2/final-verification-integrity.test.mjs`

Before storing a passed final-output manifest, `setFinalVerification()` now checks the portable facts for internal consistency. A supposedly passed record is rejected if it contains an error issue, no verified video, non-positive/missing dimensions, dimensions that disagree with its configured expected target, non-positive duration, or an explicitly too-small file size.

On read/export, an older saved snapshot with the current render signature but inconsistent facts is treated as not fresh for publishing (`verification-facts-inconsistent`) and is not exported as `finalVideoVerified:true`. This prevents an imported or mutated historical record from bypassing current deterministic verification simply by retaining `verified:true`.

Do not weaken render-signature freshness or the stronger FFprobe/bridge evidence path used by the one-click release boundary.

### Owner approval refresh reasons are explicit in the status view
- `v2/one-click-status-view.mjs`
- `v2/one-click-status-view.test.mjs`

When a previously recorded owner approval is not current, the presentation layer now distinguishes release metadata/provenance changes, render-input changes, changed trusted technical evidence, missing current machine verification, missing technical-verification signature, legacy approval records, and incomplete owner confirmations. The next action remains conservative and publishing remains manual.

## Required focused rerun after reconciliation

```bash
node --test \
  v2/draft-execution-ledger.test.mjs \
  v2/job-dependency-scheduler.test.mjs \
  v2/final-media-facts.test.mjs \
  v2/final-verification-gate.test.mjs \
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

When finished, commit/push the reconciled local integration plus these remote fixes and report exact focused/full test counts, browser/FFmpeg/FFprobe result, files changed, and final remote SHA.
