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

3. **Reference-library metadata + live controls**
   - `references.mjs` separates character and world image references.
   - Reference images can be locked without deleting/replacing their original bytes.
   - Bridge reference paths are returned only when a workflow explicitly declares the relevant reference capability.
   - `core.mjs` includes approved reference labels in generated scene prompts.
   - `studio-enhancements.mjs` adds a live Visual Reference Library panel where an existing image asset can be marked Character Reference, World Reference, or cleared. Marking a reference locks it by default and preserves the original file.
   - `index.html` loads the enhancement module and exposes the reference panel.

4. **Scene continuity-state foundation**
   - `continuity.mjs` creates an explicit prior-scene/current-scene continuity state.
   - Character/world/visual anchors are carried into the prompt without overwriting existing scene text or assets.
   - `core.mjs` compiles the continuity block into future scene-generation prompts.

5. **Modular media adapter contracts**
   - `media-adapters.mjs` defines descriptors and safety gates for image/video/voice/music/SFX/lip-sync/upscale adapters.
   - FREE ONLY rejects non-free adapters and all unverified adapters.
   - Motion instructions include anti-flicker, anti-drift and preserve-source rules.
   - Audio planning is separated into dialogue, voice, ambience, SFX and music cues.
   - Quality risk profiles never invent native audio, lip-sync or temporal guarantees.

6. **Deterministic technical QC + live preflight**
   - `technical-qc.mjs` checks missing files, broken scene links, short clips, aspect mismatch, caption overflow and locked-but-missing assets.
   - QC does not replace or unlock assets.
   - Future visual-AI QC remains explicitly unavailable unless an evaluator really ran.
   - `studio-enhancements.mjs` exposes a Technical QC Preflight panel in the browser. It reports deterministic errors/warnings and explicitly states that visual AI QC is unavailable until a real evaluator runs.

7. **Export preset / 4K honesty foundation**
   - `export-presets.mjs` defines 9:16, 16:9 and 1:1 target presets without enabling unverified routes.
   - 16:9 and 1:1 stay disabled until the bridge reports verified support.
   - 4K stays unavailable unless both a 4K-capable route and verified upscale capability exist.
   - Simple dimension scaling is labeled separately from detail-enhancing upscale.

8. **Scene dialogue and audio-cue metadata foundation**
   - `scene-audio.mjs` stores per-scene dialogue, voice assignment, ambience, SFX and music cues.
   - Dialogue without a voice assignment is detectable before generation.
   - Generated voice/music/SFX/lip-sync remain unavailable unless the capability report explicitly verifies a FREE ONLY route.
   - Manual local audio import remains the dependable fallback.

9. **Integration tests added**
   - `continuity.test.mjs`
   - `media-adapters.test.mjs`
   - `technical-qc.test.mjs`
   - `prompt-integration.test.mjs`
   - `export-presets.test.mjs`
   - `scene-audio.test.mjs`

## Local verification required next

Run at minimum:

```powershell
node --test v2/director.test.mjs v2/provider-router.test.mjs v2/capabilities.test.mjs v2/references.test.mjs v2/continuity.test.mjs v2/media-adapters.test.mjs v2/technical-qc.test.mjs v2/prompt-integration.test.mjs v2/export-presets.test.mjs v2/scene-audio.test.mjs v2/core.test.mjs v2/local-provider.test.mjs
```

Then run the full V2/bridge/render/smoke suite from Priority 0 in the main handoff.

Browser checks now also required:
- load `v2/index.html` through the supported local launcher and confirm both ES modules load without console errors;
- select/create a project, import or generate an image, mark it as Character Reference, confirm it becomes locked and is still previewable/exportable;
- change it to World Reference and then clear the reference, confirming original file bytes remain untouched;
- run Technical QC before clips exist and confirm warnings/errors are visible without changing assets;
- create enough valid clips to satisfy the current vertical route and confirm preflight updates correctly;
- verify the enhancement module reselects the current project after reference changes and does not accidentally switch projects with duplicate names. If duplicate-name handling is ambiguous, fix it before calling the UI verified.

Pay special attention to:
- capability response shapes from the actual local bridge;
- bridge behavior when the client includes `route` in image/video POST bodies;
- browser imports after `core.mjs` gained `references.mjs` and `continuity.mjs` dependencies;
- whether any older tests expected the previous capability row names;
- no regression in the verified 1080p FFmpeg route;
- no generation call when the FREE ONLY router reports `unavailable`;
- technical QC behavior against real imported/rendered metadata;
- `studio-enhancements.mjs` project selection/reselection behavior;
- no 16:9, 1:1 or 4K UI exposure until the corresponding render paths are actually tested.

## Next implementation targets after verification

- Extend the allowlisted local ComfyUI bridge capability response with explicit `supportsCharacterReferences` / `supportsWorldReferences` metadata before passing any reference file path to a workflow.
- Feed actual approved reference paths to only a verified compatible local workflow.
- Integrate `scene-audio.mjs` controls into scene cards for dialogue / voice / ambience / SFX / music cue editing.
- Add adapter discovery for truly free/local motion, voice, SFX/music and lip-sync only after hardware checks.
- Integrate `export-presets.mjs` into UI only after 16:9 and 1:1 bridge assembly routes pass real render tests.
- Add final-export QC gating so deterministic errors must be acknowledged or fixed before final assembly, without auto-replacing locked assets.
- Add stronger project selection IDs/data attributes in the live UI so duplicate project names cannot confuse enhancement controls.

## Safety reminder

Do not enable paid providers, large model downloads, remote media uploads, admin installs, force-pushes, or destructive file changes without owner approval. Preserve V1/main and all existing media/assets.
