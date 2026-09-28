# Work / Codex — Next: Release Envelope

Read this after the main V2 handoff files.

Chat-side added:
- `v2/release-envelope.mjs`
- `v2/release-envelope.test.mjs`

Purpose: create one portable owner handoff envelope that combines publishing metadata, owner handoff, provenance summary and owner-release approval status without granting automatic publishing permission.

## Verify locally

Run:

```powershell
node --test v2/release-envelope.test.mjs v2/release-approval.test.mjs v2/asset-provenance.test.mjs v2/publishing.test.mjs v2/publishing-readiness.test.mjs v2/final-output.test.mjs
```

Then run the full V2/bridge regression suite.

## Required checks

1. A deterministic-ready project with no owner approval must report `OWNER APPROVAL REQUIRED`.
2. A fresh complete owner approval may report `OWNER APPROVED — MANUAL PUBLISH ONLY`, but `publishAuthorized` must remain `false` everywhere.
3. Changing title/description, render inputs, provenance/rights metadata or any release-signature input must make prior approval stale.
4. The exported envelope must contain no local paths, bridge URLs, prompts, media bytes or project history.
5. Do not wire automatic upload/publishing from this module.
6. If adding UI later, keep the final action owner-controlled and manual unless the owner explicitly authorizes a separate publishing workflow.

## Safety

Do not modify V1/main. Do not weaken release-readiness, provenance or stale-verification checks just to make the envelope pass. No paid provider, upload, scheduling or publishing action is authorized by this module.
