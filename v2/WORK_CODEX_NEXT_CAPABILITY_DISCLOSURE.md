# Work / Codex Next — Capability Disclosure and Generation Readiness

Verified working baseline before this additive batch:

`96c8df4a4ecc064590ed7f362a7ae1add503ae1f`

That baseline had **63 focused / 399 full V2+bridge tests passing, 0 failed, 0 skipped**, all six smoke scripts passing, real browser one-prompt production, real FFmpeg/FFprobe 1080x1920 verification, backup/restore, selective regeneration, imported audio, and the correct stop at **Rights review required**.

## Verification freeze for this additive batch

This capability/readiness batch is now frozen for local verification. The code HEAD immediately before this documentation update was:

`c9b1c4fb548d8f30818dc934caa8e9a5e9956b69`

Fetch the actual remote again before running. Do not add unrelated features. Make only fixes required by failing tests or the real capability-panel/browser check.

## New additive work after the verified baseline

New module:

- `v2/generation-route-readiness.mjs`
- `v2/generation-route-readiness.test.mjs`

Small live UI integration:

- `v2/recovery-capability-ui.mjs`

Purpose: show exactly what the active FREE ONLY setup can create now without confusing draft fallbacks, imported media, or quality targets with model-backed generation.

The readiness layer now derives generation availability from the existing verified adapter registry. It additionally guards against these false-positive cases:

- mock bridge capability reports must never become generation-ready
- FFmpeg motion is not ready unless the verified adapter contract has the required FFmpeg/FFprobe support
- fallback stills and FFmpeg camera motion must never inherit photorealistic model-generation claims
- a photorealistic image target is exposed only when a verified local model image route is active
- `referenceForwardingEnabled:true` alone is insufficient; effective character/world reference support must also be verified

The current laptop baseline should truthfully report:

- basic local still fallback: verified draft route
- FFmpeg camera motion: verified draft route
- voice/music: import-only unless a real generated route is explicitly verified
- lip-sync: unavailable unless explicitly verified
- ComfyUI/model-backed image generation: unavailable unless the bridge reports a verified workflow
- model-backed motion generation: unavailable until a verified route exists
- character/world reference forwarding: unavailable until an exact local workflow node mapping is verified
- no paid provider enablement
- no automatic model download
- no automatic publishing

A route being configured or verified must never be treated as proof that photorealism, identity consistency, native audio, lip-sync, 4K, or other artistic quality was achieved.

## Required local/Codex verification

1. Fetch latest `v2-clean-studio` before touching the workspace. Preserve all stashes and local files; do not reset/clean/discard.
2. Confirm the remote contains the verified baseline `96c8df4...` plus the additive generation-readiness commits. If remote moved again, inspect and reconcile non-destructively.
3. Run at minimum:

```bash
node --test \
  v2/generation-route-readiness.test.mjs \
  v2/provider-router.test.mjs \
  v2/adapter-registry.test.mjs \
  v2/capability-disclosure.test.mjs \
  v2/capabilities.test.mjs \
  v2/readiness.test.mjs
```

The readiness tests must specifically prove:

- fallback still + fallback motion are `DRAFT_ROUTE_READY`, not model-generated
- missing FFprobe keeps motion unavailable even if FFmpeg exists
- mock bridge reports do not produce verified generation readiness
- fallback routes cannot expose photorealistic image/motion model targets
- a verified local model image route can expose its photorealistic-image target when the capability report supports it
- a raw reference-forwarding flag cannot bypass missing effective reference support
- generated voice/music/SFX/lip-sync become ready only when their verified local adapters are present

4. Then run the full regression:

```bash
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

5. Run all six smoke scripts.
6. Start the real local bridge and real V2 Studio in the browser. Click **Check verified adapters** and visually verify the new **What this setup can create now** section.
7. On the current no-model configuration, confirm the UI does **not** label the fallback still or FFmpeg motion as model generation.
8. Confirm voice/music remain `IMPORT_ONLY`, lip-sync remains unavailable, and reference forwarding remains not verified unless the actual bridge capability report proves otherwise.
9. If an already-present compatible local workflow/model becomes visible, inspect it before changing any capability. Do not guess node IDs. Do not download a large model or install a runtime without owner approval.
10. Re-run the complete one-prompt browser flow only if any capability/UI fix touches production behavior; otherwise preserve the already verified production baseline and do not churn unrelated code.

## Safety / truthfulness requirements

- `FREE ONLY` remains the default and only active mode unless the owner explicitly approves otherwise.
- Never silently enable a remote or paid provider.
- Never auto-download multi-GB models.
- Never mark a model/image/video/audio/lip-sync route ready because a config key merely exists; it must be genuinely verified by the bridge/runtime contract.
- Draft still fallback must stay labeled draft/local fallback.
- FFmpeg camera motion must stay labeled draft motion, not generative video.
- Imported voice/music is not generated audio.
- Reference declarations are not reference forwarding; exact node mapping must be locally verified first.
- Route state means route availability only.
- Quality target means an active verified route may target it; it is not proof that the current output achieved the quality.
- `verifiedOutput` requires current trusted evidence from `technical-claim-policy` / `verification-evidence`.
- Stale evidence must not support a current-output claim.
- Unknown must remain unknown; do not convert it to false/unavailable without evidence.
- No V1/main changes, no force push, no destructive media changes, and preserve locked/imported/original media.

## Report back

Return only verified results:

- exact remote SHA tested
- generation-readiness focused test count
- full V2/bridge test count
- smoke results
- browser capability-panel result
- exact current image route label/state
- exact current motion route label/state
- exact voice/music/SFX/lip-sync states
- exact reference-forwarding state/reason
- files changed if a fix was required
- whether the 399-test verified production baseline remained intact
- genuine remaining blocker only

If fixes are necessary, keep them minimal, run the affected tests plus full regression, and push only to `v2-clean-studio` without force-push.
