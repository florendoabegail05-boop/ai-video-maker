# Codex / Work master batch — 2026-09-29

Pull the latest `v2-clean-studio` first. Treat remote source as authoritative. Do not reset, force-push, or touch `main`/V1. Preserve all imported/locked media. FREE ONLY remains the default and no paid provider or large model download may be enabled automatically.

## Goal
Move the current one-click architecture from coded/pure-module state into locally verified, minimally integrated Studio execution without weakening any safety, provenance, stale-result, technical-evidence, or owner-approval boundary.

## Phase 1 — verify the newest pure modules
Run these focused suites first:

```bash
node --test \
  v2/generation-input-guard.test.mjs \
  v2/one-click-dispatch-envelope.test.mjs \
  v2/one-click-result-processor.test.mjs \
  v2/one-click-media-commit.test.mjs \
  v2/one-click-retry-dispatch.test.mjs \
  v2/one-click-manual-resolution.test.mjs \
  v2/draft-execution-ledger.test.mjs \
  v2/one-click-orchestrator.test.mjs \
  v2/one-click-status-view.test.mjs \
  v2/verification-evidence.test.mjs \
  v2/final-media-facts.test.mjs \
  v2/final-verification-gate.test.mjs \
  v2/output-readiness-summary.test.mjs \
  v2/verified-release-approval.test.mjs \
  v2/current-release-context.test.mjs
```

Fix only real mismatches. Keep fixes minimal and reversible. Do not claim tests passed until they actually run locally.

Then run:

```bash
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Record exact pass/fail counts.

## Phase 2 — real local verification
Re-run the established local checks already used successfully on this branch:
- browser/smoke tests
- local bridge tests
- real FFmpeg render verification
- real FFprobe final-file inspection

Technical facts must stay bound to the current render signature. Browser-only facts may establish width/height/duration/file size/MIME only; stream/FPS/codec/container claims require bridge/FFprobe-class evidence.

Before owner release approval, require current FFprobe/bridge-class evidence for width, height and duration. Browser-only evidence is not sufficient for the verified owner-approval record.

## Phase 3 — minimal Studio one-click integration
Integrate the current modules instead of rebuilding parallel logic:

1. `createOneClickSession`
2. `oneClickStatusView`
3. `prepareNextOneClickDispatch`
4. local guarded executor
5. `commitOneClickGeneratedMedia` or `processOneClickDispatchResult`
6. explicit `prepareOneClickRetryDispatch` only when retry was actually requested
7. `resolveManualOneClickJob` only after real imported/local media is present
8. final FFprobe evidence
9. `oneClickCompletionStatus`
10. `verifiedReleaseApprovalPreflight`
11. explicit `makeVerifiedOwnerReleaseApproval` only after owner review
12. manual publish only

### Required UI behavior
Show four read-only stages:
- Plan
- Create
- Verify
- Owner Review

Do not treat `draftExecutionSummary.complete` as success. `readyForVerification` / `successful` is the positive gate. FAILED, BLOCKED, MANUAL, stale, or unresolved required work must remain visibly unresolved.

## Phase 4 — executor rules
Every dispatched image/motion result must revalidate immediately before accepting it:
- current project operation guard
- current generation-input guard
- same scene
- same route
- exact guarded motion source image
- no hidden provider switching
- no paid fallback

Generated scene media must be added as a new candidate asset. Never overwrite/delete existing media. Locked/imported files remain untouched.

## Phase 5 — Comfy/reference boundary
Do not guess node IDs or workflow mappings.

Only enable local reference-image forwarding if the owner machine now has a verified Comfy workflow/model configuration and you can prove the exact node mapping. If not, preserve the current reference boundary that strips unsupported reference paths and reports the capability honestly.

No automatic large model downloads.

## Phase 6 — release readiness
Keep these stages separate:
1. successful required creation jobs
2. trusted current technical verification
3. current project provenance/rights review
4. publishing title present
5. current FFprobe/bridge-class width + height + duration evidence
6. fresh explicit verified owner release approval
7. manual publish action

One-click release approval must be `aivm-v2-verified-owner-release-approval` with `technicalVerifiedAtApproval:true`. Legacy `aivm-v2-owner-release-approval` records and arbitrary booleans must not satisfy the one-click release boundary.

If title/description, render inputs, provenance, rights status, credits, or other release-signature inputs change after approval, require owner review again.

Even at the final state:
- `publishAuthorized:false`
- `automaticPublishingAllowed:false`
- publishing remains manual owner-controlled action

## Hard prohibitions
Do not:
- enable paid providers
- purchase credits
- auto-download large models
- upload private media externally without explicit owner action
- delete or overwrite locked/imported assets
- bypass login/CAPTCHA/permission prompts
- invent technical verification
- invent Comfy workflow mappings
- auto-approve owner review
- auto-publish
- modify `main`/V1
- force push

## Finish report
Return:
- exact focused test counts
- exact full regression counts
- browser/smoke result
- FFmpeg/FFprobe result
- files changed
- local integration completed vs still blocked
- any owner action genuinely required
- final commit SHA
