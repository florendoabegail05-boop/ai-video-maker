# Codex next: execution-plan drift + exact motion source provenance

Pull the latest `v2-clean-studio` before editing. Preserve V1/main and all existing media. Do not force-push, delete owner media, enable paid providers, upload private media, or download large models.

## Validate the new pure modules and regressions

Run the focused tests first:

- `node --test v2/draft-plan-fingerprint.test.mjs`
- `node --test v2/one-click-orchestrator.test.mjs`
- `node --test v2/one-click-dispatch-envelope.test.mjs`
- `node --test v2/one-click-media-commit.test.mjs`

Then run the complete V2 + local-bridge test suite and existing browser/smoke checks. Report exact pass/fail counts; do not claim success for checks that did not run.

## Required behavior

1. A one-click session must replan when the executable job plan changes even if the project revision did not change. Examples: local ComfyUI becomes unavailable, FFmpeg capability changes, or creation options remove/add motion/audio/captions.
2. A revision-only rebase caused by additive generated-media registration must not invalidate the plan fingerprint.
3. Motion dispatch must include exactly one `payload.sourceAssetId` chosen at dispatch time. It must match `generationGuard.parentAssetId`.
4. The live motion executor must use that exact source asset. Do not reselect a different image later.
5. Motion executor success should return `parentAssetId` as provenance evidence. Missing evidence or a different parent ID must be rejected before media registration.
6. Locked/imported media remain preserved. New generated outputs are additive candidate assets only.
7. FREE ONLY remains authoritative. No automatic publishing.

## Integration guidance

When wiring the live executor, resolve `payload.sourceAssetId` to the current local source path only at the local execution boundary. Never put local paths in portable dispatch/session metadata. Revalidate the dispatch and generation guard immediately before FFmpeg/provider work and again before accepting the result.

If a source file disappeared, became stale, changed scene, or the guarded source ID no longer resolves, return a clear failure/replan state instead of silently selecting another image.
