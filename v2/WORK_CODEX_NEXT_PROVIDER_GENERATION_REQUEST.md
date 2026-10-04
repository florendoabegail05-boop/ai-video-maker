# Work / Codex next — provider generation request envelope

Status: coded in GitHub as an additive foundation; local execution is still required before treating this milestone as verified.

## Goal

Verify the new `provider-generation-request.mjs` boundary that converts an already-guarded image/motion dispatch envelope into a provider-neutral FREE ONLY execution request without changing the existing live executor.

The request must preserve the current capability truth:

- fallback image stays draft/local, never model-generated
- FFmpeg camera motion stays draft motion, never generative video
- reference asset IDs may travel as metadata
- reference bytes/paths are never embedded
- reference forwarding becomes eligible only for a verified local ComfyUI route with effective reference forwarding
- mock, unavailable, unsupported or route-mismatched capability reports fail closed
- paid providers, external uploads, automatic model downloads, destructive replacement and automatic publishing remain disabled
- output dimensions/timing are request targets only, not verified output facts

## Files in this additive batch

- `v2/provider-generation-request.mjs`
- `v2/provider-generation-request.test.mjs`
- `v2/WORK_CODEX_NEXT_PROVIDER_GENERATION_REQUEST.md`

No live executor, provider adapter, ComfyUI node mapping, reference-byte forwarding, publishing path or V1/main code should be changed merely to verify this foundation.

## Required local verification

First fetch/reconcile the latest `v2-clean-studio` non-destructively. Preserve all four stashes and verification media.

Run:

```bash
node --test v2/provider-generation-request.test.mjs v2/generation-route-readiness.test.mjs v2/generation-prompt-contract.test.mjs v2/generation-prompt-contract-integration.test.mjs v2/one-click-dispatch-envelope.test.mjs
```

Then run the full regression with the existing portable FFmpeg/FFprobe PATH:

```bash
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

If a real regression exists, make the smallest V2-only fix and add/retain regression coverage. Do not weaken capability guards to make tests pass.

## Acceptance

Report exact focused/full pass counts and the exact tested SHA. Confirm:

1. `basic-local-still` maps only to verified `image:fallback` readiness.
2. `local-comfyui` is ready only when the effective image route is verified local ComfyUI.
3. `ffmpeg-camera-motion` maps only to verified `video:motion-fallback` readiness.
4. Mock or mismatched route evidence returns `ready:false`.
5. Generated requests contain reference IDs but no local filesystem path or binary data.
6. Effective verified local reference support may switch reference handling to `verified-local-id-resolution`, but no bytes are forwarded by this module.
7. Photorealistic claims stay false on draft fallback routes even if a quality target flag is present.
8. FREE ONLY, no external upload, no auto-download, no destructive replacement and manual publishing safeguards remain intact.
9. Main/V1, media hashes and four stashes remain unchanged.

Do not perform a browser/production/ZIP rerun unless the local tests reveal a regression that requires touching the already verified production path. Do not add a real provider call in this verification step.
