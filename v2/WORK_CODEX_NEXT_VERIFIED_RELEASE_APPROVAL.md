# Codex / Work — verify trusted-machine-bound owner release approval

Pull the latest `v2-clean-studio` before editing. Do not touch `main`/V1. Preserve FREE ONLY behavior and all locked/imported media.

## Focus
Verify the new release-approval boundary:
- `v2/verified-release-approval.mjs`
- `v2/verified-release-approval.test.mjs`
- `v2/current-release-context.mjs`
- `v2/current-release-context.test.mjs`
- `v2/one-click-orchestrator.mjs`
- `v2/one-click-status-view.mjs`

## Required focused tests

```bash
node --test \
  v2/verified-release-approval.test.mjs \
  v2/current-release-context.test.mjs \
  v2/final-media-facts.test.mjs \
  v2/final-verification-gate.test.mjs \
  v2/output-readiness-summary.test.mjs \
  v2/one-click-orchestrator.test.mjs \
  v2/one-click-status-view.test.mjs
```

Then run the full suite:

```bash
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

## Semantics to verify
1. Browser-only dimensions/duration may still inform the normal technical gate, but they are not enough to create a verified owner release approval.
2. Owner release approval requires current width, height and duration established by FFprobe/bridge-class evidence.
3. The same current render must pass the configured technical verification gate.
4. Project provenance must be complete and a publishing title must exist before approval can be recorded.
5. The approval record must be `aivm-v2-verified-owner-release-approval` with `technicalVerifiedAtApproval:true` and all explicit owner review flags true.
6. Legacy `aivm-v2-owner-release-approval` records must not satisfy the one-click release boundary.
7. Any release-signature or render-input change after approval makes the approval stale.
8. Even a fresh verified approval never sets `publishAuthorized` or `automaticPublishingAllowed` true.

## Studio integration target
When the local Studio owner-review UI is wired, create the verified approval only after the current final MP4 has been inspected locally with FFprobe/bridge-class evidence and after the owner explicitly confirms visual/audio review, rights/credits review, and platform settings review.

Do not auto-approve. Do not auto-publish. Do not upload private media or enable paid providers. Record exact test counts and the final commit SHA.
