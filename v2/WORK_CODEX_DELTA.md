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

12. **Non-destructive recovery snapshot foundation**
   - `recovery.mjs` creates deep-cloned recovery snapshots without mutating the live project.
   - Snapshot collections are bounded, project-scoped and ID-safe.
   - Restore refuses cross-project snapshots and records recovery provenance.
   - Locked assets remain locked inside snapshots; no media file is deleted or overwritten.

13. **Final-output verification manifest foundation**
   - `final-output.mjs` validates deterministic final-media facts: video stream presence, expected dimensions, planned duration tolerance, low-FPS warning and suspiciously tiny output.
   - It creates a portable manifest that intentionally excludes local paths, bridge URLs and media bytes.
   - It does **not** pretend to verify photorealism, identity consistency, anatomy, flicker or artistic quality.

14. **Capability-derived FREE ONLY adapter registry**
   - `adapter-registry.mjs` derives available image/video/voice/music/SFX/lip-sync/upscale adapters only from reported capabilities.
   - Unsupported or unverified routes do not appear as available.
   - This is a discovery layer only; it does not auto-download models or enable paid providers.

15. **Live recovery + verified-adapter UI**
   - `recovery-store.mjs` persists bounded metadata-only recovery snapshots under a dedicated localStorage key and never duplicates media bytes.
   - `recovery-capability-ui.mjs` exposes manual recovery snapshots, safe pre-restore snapshots, project-ID-safe restore, snapshot deletion, and live FREE ONLY adapter registry display.
   - Restoring a snapshot first captures the current project state as `Before recovery restore` so the restore itself is reversible at the metadata level.
   - `index.html` exposes `Recovery & Version Safety` plus `FREE ONLY Adapter Registry` panels.

16. **Final MP4 verification + publishing integration**
   - `final-output-ui.mjs` lets the owner select the downloaded final MP4 and reads browser-supported width, height, duration and file size without uploading the file.
   - A passed manifest can be saved only to the same project ID; failed, malformed or cross-project manifests are refused.
   - `publishing.mjs` preserves existing verification when title/description changes and exports `finalVideoVerified: true` only when a saved passed manifest exists.
   - Publishing output includes only portable verification facts; no local path, media bytes or bridge URL is exported.
   - The UI explicitly labels this as deterministic media-fact verification, **not** photorealism/flicker/anatomy/identity/lip-sync/audio-quality verification.

## Tests added or extended in chat

- `v2/continuity.test.mjs`
- `v2/media-adapters.test.mjs`
- `v2/technical-qc.test.mjs`
- `v2/prompt-integration.test.mjs`
- `v2/export-presets.test.mjs`
- `v2/scene-audio.test.mjs`
- `v2/project-selection.test.mjs`
- `v2/recovery.test.mjs`
- `v2/recovery-store.test.mjs`
- `v2/final-output.test.mjs`
- `v2/adapter-registry.test.mjs`
- `v2/publishing.test.mjs` now covers saved final verification and preservation across publishing-detail edits.
- `local-bridge/workflow-capabilities.test.mjs`

## Local verification required next

Run at minimum:

```powershell
node --test v2/director.test.mjs v2/provider-router.test.mjs v2/capabilities.test.mjs v2/references.test.mjs v2/continuity.test.mjs v2/media-adapters.test.mjs v2/technical-qc.test.mjs v2/prompt-integration.test.mjs v2/export-presets.test.mjs v2/scene-audio.test.mjs v2/project-selection.test.mjs v2/recovery.test.mjs v2/recovery-store.test.mjs v2/final-output.test.mjs v2/adapter-registry.test.mjs v2/publishing.test.mjs v2/core.test.mjs v2/local-provider.test.mjs local-bridge/workflow-capabilities.test.mjs
```

Then run the full V2/bridge/render/smoke suite from Priority 0 in the main handoff.

Browser checks also required:
- load `v2/index.html` through the supported local launcher and confirm all five browser modules load without console errors: `studio.mjs`, `studio-enhancements.mjs`, `audio-qc-ui.mjs`, `recovery-capability-ui.mjs`, `final-output-ui.mjs`;
- create two projects with the same display name and prove Character/World reference changes, QC, audio-plan edits, recovery actions and final verification stay on the selected project ID;
- create a recovery snapshot, modify scene metadata, restore it, confirm a pre-restore safety snapshot is created and no media bytes are duplicated/deleted;
- reload and verify recovery history persists without inflating media storage;
- run `Check verified adapters` with the bridge online and compare every displayed adapter against `/v1/capabilities`;
- mark an image Character Reference, change it to World Reference, then clear it; original bytes must remain previewable/exportable;
- confirm Assemble final MP4 is blocked only by real deterministic QC errors and becomes available after valid clips satisfy the gate;
- assemble/download a real 1080×1920 MP4, select that file in **Final MP4 verification**, and verify browser-readable width/height/duration/bytes are saved as a passed manifest;
- select a wrong-resolution or wrong-duration MP4 and confirm it is refused as verified;
- save/change publishing title or description after final verification and confirm verification remains attached to the same project;
- export publishing JSON and confirm `finalVideoVerified` is true only for a saved passed manifest and no local paths are present.

## Work/Codex tasks that need the real laptop/bridge

1. Wire `workflow-capabilities.mjs` into the actual `/v1/capabilities` response for the allowlisted image workflow.
2. Inspect the real configured ComfyUI workflow before deciding where reference file paths belong. Do **not** guess node IDs or silently rewrite arbitrary nodes.
3. Pass approved character/world reference paths only when the workflow declares the matching capability and the path is already a safe local imported/generated asset.
4. Add integration tests proving unsupported workflows receive zero reference paths.
5. Re-run the verified 1080p FFmpeg render route and confirm no regression.
6. Cross-check the browser final-output manifest against real `ffprobe`/bridge media metadata. If they disagree, bridge/ffprobe wins; add FPS/audio-stream facts only from real inspection rather than guessing them in browser code.
7. Verify localStorage snapshot size remains reasonable on real projects. If metadata growth is too large, move recovery metadata to IndexedDB, but do not duplicate media bytes.
8. Run `adapter-registry.mjs` against the live capability response and fix any shape mismatch; never mark a route verified just to make the UI look complete.
9. Only after real render tests, consider exposing 16:9 / 1:1 presets or further export options.
10. Inspect actual hardware before enabling any local motion/voice/lip-sync model; do not download multi-GB models without owner approval.

## Safety reminder

Do not enable paid providers, large model downloads, remote media uploads, admin installs, force-pushes, or destructive file changes without owner approval. Preserve V1/main and all existing media/assets.
