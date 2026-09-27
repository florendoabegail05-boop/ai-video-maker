# V2 Chat-Side Delta for Work / Codex

Read this **after** `v2/WORK_CODEX_HANDOFF.md`.

These changes were made from ChatGPT chat after the last known local Work/Codex verification. They are committed on `v2-clean-studio` but **must not be called locally verified yet**.

## Newly implemented in chat

1. **AI Director integration**
   - `director.mjs` defines style-aware quality targets and scene direction.
   - `core.mjs` already compiles `directorBrief(...)` into every future scene-generation prompt.
   - Scene plans carry structured shot/camera/motion/continuity/audio direction.

2. **FREE ONLY provider router**
   - `provider-router.mjs` selects only verified FREE ONLY routes by default.
   - Paid-capable modes require explicit owner approval and are not connected.
   - `capabilities.mjs` now reports the selected image/motion route and separates verified claims from quality targets.
   - `local-provider.mjs` now checks the route plan before image/video generation and sends the selected route identifier to the loopback bridge.

3. **Reference-library metadata foundation**
   - `references.mjs` separates character and world image references.
   - Reference images can be locked without deleting/replacing their original bytes.
   - Bridge reference paths are returned only when a workflow explicitly declares the relevant reference capability.
   - `references.test.mjs` covers role separation, safe locking, unsupported file rejection and capability-gated bridge inputs.

## Local verification required next

Run at minimum:

```powershell
node --test v2/director.test.mjs v2/provider-router.test.mjs v2/capabilities.test.mjs v2/references.test.mjs v2/core.test.mjs v2/local-provider.test.mjs
```

Then run the full V2/bridge/render/smoke suite from Priority 0 in the main handoff.

Pay special attention to:
- capability response shapes from the actual local bridge;
- bridge behavior when the client includes `route` in image/video POST bodies;
- whether any older tests expected the previous capability row names;
- whether the browser capability panel still renders cleanly;
- no regression in the verified 1080p FFmpeg route;
- no generation call when the FREE ONLY router reports `unavailable`.

## Next implementation targets after verification

- Wire the new `references.mjs` metadata into live Studio controls (mark an image as Character Reference / World Reference, clear reference, show references in Project Assets).
- Extend the allowlisted local ComfyUI bridge capability response with explicit `supportsCharacterReferences` / `supportsWorldReferences` metadata before passing any reference file path to a workflow.
- Add continuity-state metadata per scene rather than relying only on adjacent beat text.
- Add provider-adapter interfaces for real FREE ONLY motion, voice, SFX/music and lip-sync while preserving current import/FFmpeg fallbacks.

## Safety reminder

Do not enable paid providers, large model downloads, remote media uploads, admin installs, force-pushes, or destructive file changes without owner approval. Preserve V1/main and all existing media/assets.
