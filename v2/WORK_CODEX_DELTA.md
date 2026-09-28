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
   - `capabilities.mjs` reports selected image/motion routes and separates verified claims from quality targets.
   - `local-provider.mjs` checks the route plan before image/video generation.

3. **Reference-library metadata + live controls**
   - `references.mjs` separates character and world image references.
   - Reference images can be locked without deleting/replacing original bytes.
   - `core.mjs` includes approved reference labels in scene-generation prompts.
   - `studio-enhancements.mjs` exposes Character Reference / World Reference / Clear Reference controls.

4. **Scene continuity-state foundation**
   - `continuity.mjs` carries prior/current scene state plus character/world/visual anchors into future prompts.

5. **Modular media adapter contracts**
   - `media-adapters.mjs` defines descriptors and FREE ONLY verification gates for image/video/voice/music/SFX/lip-sync/upscale adapters.
   - Motion instructions include anti-flicker, anti-drift and preserve-source rules.

6. **Deterministic technical QC + live preflight**
   - `technical-qc.mjs` checks missing files, broken scene links, short clips, aspect mismatch, caption overflow and locked-but-missing assets.
   - Live UI reports errors/warnings without auto-replacing assets.

7. **Export preset / 4K honesty foundation**
   - `export-presets.mjs` models 9:16, 16:9 and 1:1, but unverified routes stay disabled.
   - 4K requires a genuinely capable route and verified output; simple scaling is not labeled detail-enhancing upscale.

8. **Scene dialogue/audio planning + live UI**
   - `scene-audio.mjs` stores dialogue, voice assignment, ambience, SFX and music cues.
   - `audio-qc-ui.mjs` exposes per-scene planning and checks FREE ONLY generated-audio capability metadata.
   - Manual audio import remains the dependable fallback.

9. **QC final-assembly gate**
   - Final MP4 assembly is disabled when deterministic technical QC contains errors and re-enabled when the saved project passes.
   - The gate never unlocks, replaces or deletes media.

10. **Duplicate-project-safe enhancement selection**
   - `project-selection.mjs` adds ID-first project selection and button decoration that follows the same updatedAt sort order as the main studio list.
   - `studio-enhancements.mjs` now tracks `data-project-id` instead of reselecting by project name, preventing duplicate names from switching the wrong project.
   - Ambiguous name/prompt fallback returns null instead of guessing.

11. **Explicit ComfyUI reference-capability detection**
   - `local-bridge/workflow-capabilities.mjs` recognizes reference support only when an allowlisted workflow explicitly declares markers such as `AIVM_CHARACTER_REFERENCE` or `AIVM_WORLD_REFERENCE`.
   - Unsupported reference roles are stripped from payloads rather than forwarded.
   - This module is intentionally not yet wired into `server.mjs`; Work/Codex must verify the real workflow shape before enabling reference-file forwarding.

## Tests added in chat

- `v2/continuity.test.mjs`
- `v2/media-adapters.test.mjs`
- `v2/technical-qc.test.mjs`
- `v2/prompt-integration.test.mjs`
- `v2/export-presets.test.mjs`
- `v2/scene-audio.test.mjs`
- `v2/project-selection.test.mjs`
- `local-bridge/workflow-capabilities.test.mjs`

## Local verification required next

Run at minimum:

```powershell
node --test v2/director.test.mjs v2/provider-router.test.mjs v2/capabilities.test.mjs v2/references.test.mjs v2/continuity.test.mjs v2/media-adapters.test.mjs v2/technical-qc.test.mjs v2/prompt-integration.test.mjs v2/export-presets.test.mjs v2/scene-audio.test.mjs v2/project-selection.test.mjs v2/core.test.mjs v2/local-provider.test.mjs local-bridge/workflow-capabilities.test.mjs
```

Then run the full V2/bridge/render/smoke suite from Priority 0 in the main handoff.

Browser checks also required:
- load `v2/index.html` through the supported local launcher and confirm `studio.mjs`, `studio-enhancements.mjs`, and `audio-qc-ui.mjs` load without console errors;
- create two projects with the same display name and prove Character/World reference changes, QC, and audio-plan edits stay on the selected project ID;
- mark an image Character Reference, change it to World Reference, then clear it; original bytes must remain previewable/exportable;
- confirm Assemble final MP4 is blocked only by real deterministic QC errors and becomes available after valid clips satisfy the gate;
- confirm dialogue/audio-cue metadata survives save, reselect and page reload;
- query FREE ONLY audio routes and confirm unverified voice/music/SFX/lip-sync are never presented as available.

## Work/Codex tasks that need the real laptop/bridge

1. Wire `workflow-capabilities.mjs` into the actual `/v1/capabilities` response for the allowlisted image workflow.
2. Inspect the real configured ComfyUI workflow before deciding where reference file paths belong. Do **not** guess node IDs or silently rewrite arbitrary nodes.
3. Pass approved character/world reference paths only when the workflow declares the matching capability and the path is already a safe local imported/generated asset.
4. Add integration tests proving unsupported workflows receive zero reference paths.
5. Re-run the verified 1080p FFmpeg render route and confirm no regression.
6. Only after real render tests, consider exposing 16:9 / 1:1 presets or further export options.
7. Inspect actual hardware before enabling any local motion/voice/lip-sync model; do not download multi-GB models without owner approval.

## Safety reminder

Do not enable paid providers, large model downloads, remote media uploads, admin installs, force-pushes, or destructive file changes without owner approval. Preserve V1/main and all existing media/assets.
