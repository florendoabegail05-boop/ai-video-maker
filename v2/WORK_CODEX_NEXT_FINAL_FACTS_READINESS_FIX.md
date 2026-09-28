# Work / Codex Next — Final Facts + Readiness Verification

Start from current `v2-clean-studio`. Pull safely. Do not force-push. Preserve V1/main and owner/imported media.

## What changed

This batch tightened the technical evidence and output-readiness chain:

- `verification-evidence.mjs`
  - current trusted evidence now outranks unsupported explicit claims;
  - unsupported browser stream/FPS/codec claims must never beat trusted machine unknown evidence.
- `final-media-facts.mjs`
  - browser-observable width/height/duration/fileSize/mimeType may fill a current machine `null` gap;
  - browser facts must never fill audio-stream/FPS/codec/container/resolution claims;
  - duration contradictions now allow a small 0.05s rounding tolerance;
  - material duration disagreements still block.
- `final-verification-gate.mjs`
  - blockers now carry structured reason codes such as `dimensions-unknown`, `dimensions-mismatch`, `audio-unknown`, `audio-absent`, `facts-contradict`.
- `output-readiness-summary.mjs`
  - missing technical evidence is now `TECHNICAL VERIFICATION REQUIRED` rather than generic `BLOCKED`;
  - known-invalid technical output remains `BLOCKED`;
  - rights-blocked remains `BLOCKED`;
  - successful technical verification still advances only to rights review / owner approval;
  - publication remains manual owner-controlled only.

## Focused tests to run first

Run these exact test modules:

- `v2/verification-evidence.test.mjs`
- `v2/final-media-facts.test.mjs`
- `v2/final-verification-gate.test.mjs`
- `v2/output-readiness-summary.test.mjs`
- `v2/one-click-orchestrator.test.mjs`

Then run the full V2 and local-bridge regression suites plus the existing smoke tests.

## Required behavioral checks

1. FFprobe explicit facts outrank browser facts when both are current and trusted.
2. If FFprobe width/height/duration are `null`, current browser-observed values can be selected for those browser-supported fields.
3. Browser evidence can never prove audio stream, FPS, codec, container, native audio, lip-sync, or 4K claims.
4. `duration: 5.00` vs `5.01` must not create a contradiction; a materially different duration such as `5.00` vs `5.20` must.
5. Stale render signatures remain unknown and cannot support readiness.
6. Missing technical facts should label readiness `TECHNICAL VERIFICATION REQUIRED`, not `BLOCKED`.
7. Known wrong dimensions, explicit missing required audio, or contradictory current facts remain hard `BLOCKED` conditions.
8. Technical PASS must not imply rights clearance, owner approval, platform eligibility, or publishing authority.
9. `publishAuthorized` and `automaticPublishingAllowed` must remain `false` throughout this chain.

## Local verification

Where FFmpeg/FFprobe are available, use a real locally rendered MP4 and compare browser-readable metadata with FFprobe facts. Preserve the current render signature and verify that a changed render input invalidates old evidence.

Do not download large models, enable paid providers, upload private media externally, delete/overwrite owner media, weaken current release approval rules, or auto-publish.

If a test exposes a mismatch between these helpers and the live Studio integration, prefer the stricter honest behavior and report the exact integration point before changing high-conflict UI/bridge files.
