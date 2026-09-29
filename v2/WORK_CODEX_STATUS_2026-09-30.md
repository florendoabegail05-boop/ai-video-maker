# Productization verification — 2026-09-30

Remote base tested: `e9bbe71a3ae2d393533c92a2ed64340dca003333`.
Necessary-fixes commit: `69bcfe37ee50daafab920bb8d1e599dc9d964b04`.
Branch: `v2-clean-studio` only. This report is a separate documentation commit following the fixes.

## Scope and actual fixes

The existing workspace was clean and fast-forwarded from the previously verified baseline. All three existing stashes were retained. No reset, clean, force push, main/V1 changes, model download, paid provider, private-media upload or original-media replacement was used.

The feature freeze was respected. Two actual regressions required changes:

1. Numbered list markers were split into independent story actions, so a three-item prompt produced six steps. Strip the list marker before sentence splitting. Existing failing assertions were retained.
2. The prompt guide refreshed on the file-input event before asynchronous restore completed, leaving blank guidance beside the restored prompt. Refresh when Studio renders the restored project summary. Added a regression covering that timing and unchanged prompt text.

Code files changed: `v2/story-steps.mjs`, `v2/prompt-guide-ui.mjs`, `v2/prompt-guide-ui.test.mjs` (new). Documentation: this report and `v2/WORK_CODEX_HANDOFF.md`.

## Tests actually run

| Check | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Initial required focused files | 60 | 2 | 0 |
| Initial full V2/bridge baseline | 396 | 2 | 0 |
| Final required focused files plus new async UI regression | 63 | 0 | 0 |
| Final full `node --test v2/*.test.mjs local-bridge/*.test.mjs` | 399 | 0 | 0 |

Final focused duration: 2.609 seconds. Final full duration: 24.621 seconds. The required focused list itself has 62 passing tests; the additional UI regression makes 63. All six smoke scripts passed, including the automatic-production, creator-director, future-proof, hardware-routing, media-engine and quality-engine suites. Real render tests ran, not skipped. Whitespace checks passed.

## Real browser owner workflow

- **Fresh one prompt:** with no selected project, entered the three-step Maya/forest/door story, left name blank, selected 15 seconds, cinematic style and light hardware, and supplied Character/World/Visual Rules text. One click on `Create video · FREE ONLY` created exactly one project, derived its name, automatically planned three scenes in order, started production and completed **10/10 required jobs**. No manual Plan-only click was needed. The single create control and existing progress view are positioned together near the settings.
- **Planner/guidance:** English three-step and Taglish four-step sequences detected correctly. Numbered and bulleted multiline prompts produced three steps while preserving textarea contents and line structure. Ordinary multiline descriptive text stayed broad. Plan only created the expected numbered scene order without starting production. This is deterministic local planning, not a claim of model-backed understanding.
- **Existing project:** Create reused existing scene IDs, prompts, durations, and locked reference records. After deliberate reference changes made motion stale, only legitimate additive replacement motion was created. All three new motion records referenced the appropriate scene's source still, including the selectively regenerated third-scene still.
- **Keep/Lock/Unlock/reference:** exercised all requested controls. Character and World references were displayed as locked. Generic Use as reference was exercised separately. Original files and asset records were preserved.
- **Selective regeneration:** regenerated the unlocked scene-3 still. Asset count increased from 6 to 7, all old IDs and source paths remained, and other scenes' complete asset records stayed identical. Later motion bound to the new still. Reference changes had already invalidated eligible generated visuals; those expected broader changes were kept separate from the selective-regeneration comparison.
- **Audio:** imported the already-present synthetic WAV into both supported roles (music and voice track). This verifies file import and assembly roles, not generated speech. Production stopped at MANUAL audio with 8/11 required jobs done; explicit local-media resolution inspected the imported files and reached 9/11, then Continue assembled and verified **11/11**. Audio/video codec evidence passed. Silent runs completed without a fake missing-audio blocker.
- **Changed prompt:** from an existing selected project, a different prompt created a separate ID and prompt-derived name while retaining the old selectable project. Repeated with an explicitly typed name; `Owner named lantern test` was retained. Both new silent projects completed **10/10** and stopped at rights review.
- **Release:** successful runs stopped at **Rights review required**. On the audio-bearing Maya project, 12 provenance records still required review and owner-review controls were disabled. No rights declarations or owner confirmations were fabricated. `publishAuthorized:false` and `automaticPublishingAllowed:false` remain enforced.
- **Console:** no captured errors in either browser namespace at the final check.

## Backups and recovery actually exercised

Project metadata JSON and complete ZIP were downloaded through the real browser controls. Restored the actual six-asset ZIP into a separate localhost storage namespace, leaving the original 127.0.0.1 project untouched. The restored still preview opened successfully. Restored assets reported `needs bridge reconnect`; all source paths were disconnected. Re-exported the restored ZIP and compared each media blob: **6/6 byte-identical**.

Restored an actual metadata-only export of the lantern project into the other namespace; the app correctly reported **6 missing browser media files**. Also restored an isolated malformed fixture with one audio record and no scenes: it reported the missing file and Create stopped with the repair message rather than remapping media. This fixture verified the asynchronous prompt-guide fix too.

Created a recovery snapshot, changed a caption, then restored metadata. The caption edit was reverted and the previous state was retained as a second, before-restore safety snapshot. No media bytes were deleted or replaced.

## Failure and safety boundaries

Blank primary-action click stopped with `Enter a video idea` before production. The malformed no-scenes fixture stopped for repair. An isolated **real non-mock bridge**, with local fallbacks disabled and no model/runner configured, returned **HTTP 503 / unavailable** for FREE ONLY image generation and created zero media files. This unavailable-route check used the real bridge API, not a browser route override. The main Studio/bridge remained running.

The full passing regression covers explicit-only retry, stale-result rejection, exact parent binding, rights gating, required machine width/height/duration, audio-bearing codec requirements, technical-stamp invalidation, provenance/release staleness and portable privacy. This run exercised manual resolution directly in the browser; it did not manufacture an additional transient browser failure solely to repeat the previous milestone's explicit-retry browser test.

## Actual final-file verification

Real FFmpeg rendering and the real 1080x1920 caption/audio regression passed. Independent FFprobe inspection of the final Maya browser output matched `/v1/inspect` and the Studio facts:

- MP4 output; FFprobe container family `mov,mp4,m4a,3gp,3g2,mj2`.
- **1080 x 1920**, **30/1 FPS**, **15.000000 seconds**.
- Video codec **h264**; audio stream present with codec **aac**.
- File size **1,090,546 bytes**.
- SHA-256: `2CE279F2ED982E0710E9B7E5E392E37F13D902A52758A9EEA2B7F36402D01211`.
- Audio-bearing file basename: `aivm-v2-22932336-4c2e-440e-b921-a3f75385ace8-a59a908c-dba3-4be4-98d0-174962e8387c.mp4`.

Silent browser runs showed trusted bridge evidence for 1080x1920, 15 seconds, 30 FPS, h264 and explicit audio absence; audio codec remained unknown. No claim is made for 4K generation, native generated voice/music, lip-sync or artistic/audio quality.

## Media preservation

Hashed every pre-existing file before and after testing: **33/33 unchanged, 0 missing**. The 29 new files were separate additions: 10 generated stills, 12 motion clips, 5 final exports and 2 imported audio copies. Total: 62 files. Existing original, generated, locked, reference and imported media were retained. Backup files and verification logs are outside the media directory and counted separately.

## Remaining limitations and owner actions

Basic still fallback, FFmpeg camera motion, local media imports, assembly, machine verification, planning, backups and rights-gated release preparation are verified here. No compatible ComfyUI workflow/model is configured; reference-image forwarding and generative model routes remain unavailable. No node IDs were guessed or models installed. Native voice generation, generated music, lip-sync and artistic quality remain unverified/unavailable.

Owner provenance/rights/credits review and explicit final confirmations are still required before verified owner approval, followed by manual publishing only. That intended release gate is not a render failure. No owner action is needed to sync the verified fixes. No unresolved verification or media-preservation blocker remains within the tested workflow.
