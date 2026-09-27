# V2 Chat-Side Delta for Work / Codex

Read this **after** `v2/WORK_CODEX_HANDOFF.md`.

These changes were made from ChatGPT chat after the last known local Work/Codex verification. They are committed on `v2-clean-studio` but **must not be called locally verified yet**.

## Newly implemented in chat

1. **AI Director integration**
   - `director.mjs` defines style-aware quality targets and scene direction.
   - `core.mjs` compiles `directorBrief(...)` into every future scene-generation prompt.
   - Scene plans carry structured shot/camera/motion/continuity/audio direction.

2. **FREE ONLY provider router**
   - `provider-router.mjs` selects only verified FREE ONLY routes by default.
   - Paid-capable modes require explicit owner approval and are not connected.
   - `capabilities.mjs` reports the selected image/motion route and separates verified claims from quality targets.
   - `local-provider.mjs` checks the route plan before image/video generation and sends the selected route identifier to the loopback bridge.

3. **Reference-library metadata foundation**
   - `references.mjs` separates character and world image references.
   - Reference images can be locked without deleting/replacing their original bytes.
   - Bridge reference paths are returned only when a workflow explicitly declares the relevant reference capability.
   - `core.mjs` now includes approved reference labels in generated scene prompts.

4. **Scene continuity-state foundation**
   - `continuity.mjs` creates an explicit prior-scene/current-scene continuity state.
   - Character/world/visual anchors are carried into the prompt without overwriting existing scene text or assets.
   - `core.mjs` now compiles the continuity block into future scene-generation prompts.

5. **Modular media adapter contracts**
   - `media-adapters.mjs` defines descriptors and safety gates for image/video/voice/music/SFX/lip-sync/upscale adapters.
   - FREE ONLY rejects non-free adapters and all unverified adapters.
   - Motion instructions include anti-flicker, anti-drift and preserve-source rules.
   - Audio planning is separated into dialogue, voice, ambience, SFX and music cues.
   - Quality risk profiles never invent native audio, lip-sync or temporal guarantees.

6. **Deterministic technical QC foundation**
   - `technical-qc.mjs` checks missing files, broken scene links, short clips, aspect mismatch, caption overflow and locked-but-missing assets.
   - QC does not replace or unlock assets.
   - Future visual-AI QC remains explicitly unavailable unless an evaluator really ran.

7. **Integration tests added**
   - `continuity.test.mjs`
   - `media-adapters.test.mjs`
   - `technical-qc.test.mjs`
   - `prompt-integration.test.mjs`

## Local verification required next

Run at minimum:

```powershell
node --test v2/director.test.mjs v2/provider-router.test.mjs v2/capabilities.test.mjs v2/references.test.mjs v2/continuity.test.mjs v2/media-adapters.test.mjs v2/technical-qc.test.mjs v2/prompt-integration.test.mjs v2/core.test.mjs v2/local-provider.test.mjs
```

Then run the full V2/bridge/render/smoke suite from Priority 0 in the main handoff.

Pay special attention to:
- capability response shapes from the actual local bridge;
- bridge behavior when the client includes `route` in image/video POST bodies;
- browser imports after `core.mjs` gained `references.mjs` and `continuity.mjs` dependencies;
- whether any older tests expected the previous capability row names;
- whether the browser capability panel still renders cleanly;
- no regression in the verified 1080p FFmpeg route;
- no generation call when the FREE ONLY router reports `unavailable`;
- technical QC behavior against real imported/rendered metadata.

## Next implementation targets after verification

- Wire `references.mjs` into live Studio controls: mark an image as Character Reference / World Reference, clear reference, and show reference labels in Project Assets.
- Extend the allowlisted local ComfyUI bridge capability response with explicit `supportsCharacterReferences` / `supportsWorldReferences` metadata before passing any reference file path to a workflow.
- Feed actual approved reference paths to only a verified compatible local workflow.
- Wire `technical-qc.mjs` into the final export UI as a visible preflight report.
- Add live dialogue/voice assignment controls using the new audio-plan contract while keeping manual import working.
- Add adapter discovery for truly free/local motion, voice, SFX/music and lip-sync only after hardware checks.
- Add 16:9 and 1:1 export validation before exposing those presets.

## Safety reminder

Do not enable paid providers, large model downloads, remote media uploads, admin installs, force-pushes, or destructive file changes without owner approval. Preserve V1/main and all existing media/assets.
