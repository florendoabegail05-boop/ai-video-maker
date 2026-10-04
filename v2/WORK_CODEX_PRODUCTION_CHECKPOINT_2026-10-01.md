# Production verification checkpoint — 2026-10-01

Current remote/base HEAD: `46743a6262fe092e0da0a4920bd65ad14337860b`, freshly fetched without discarding local work. Branch: v2-clean-studio only. This report describes that base PLUS the uncommitted capability fixes and the quick-start fix below. No final commit SHA exists yet. Four preservation stashes remain intact.

## Actual UI bug and smallest fix

Fresh/changed prompts created a separate scene plan but could remain at Plan/Create/Verify/Owner Review WAITING until a second activation. The Create handler synchronously called the same button's click method while its activation was still in progress. A first microtask replay passed an incomplete mock test but still failed in the real browser; it is NOT the final fix.

Final change: `v2/quick-start-ui.mjs` replays the existing Create action on the next event-loop task with setTimeout(...,0). The existing planner, production listener, execution guards, and rights logic are retained. No parallel production architecture was added. `v2/quick-start-ui.test.mjs` models reentrant-click suppression including a microtask checkpoint before activation ends. It reproduced the failure before the final fix and now verifies single activation, existing-plan reuse and changed-prompt isolation.

## Tests actually executed on the final fix

- Affected quick-start suites: **8 passed, 0 failed, 0 skipped** (625.379 ms).
- Seven capability-focused suites: **43 passed, 0 failed, 0 skipped** (1955.873 ms).
- Full node --test v2/*.test.mjs local-bridge/*.test.mjs: **420 passed, 0 failed, 0 skipped** (47909.437 ms), including real FFmpeg rendering and FFprobe checks.
- All six smoke scripts passed: automatic-production, creator-director, future-proof, hardware-routing, media-engine, quality-engine.
- git diff --check passed.

The earlier 419 full-test checkpoint remains historical; the added quick-start UI regression makes the current count 420. Capability-panel browser verification remains passed and was not repeated.

## Real LOCAL browser production results

The current built-in browser tab is http://127.0.0.1:8094/v2/; real non-mock bridge is on 8787. No cloud browser was used. Initial failed test projects were preserved, not deleted.

- **True fresh one-click: PASS after final fix.** Project `October one-click final check`, id `3fe50926-da92-4140-8a03-157dbcaf2d83`, three 5-second scenes. Exactly one activation of Create video FREE ONLY automatically planned, created stills/motion, rendered and verified **10/10 required jobs**. No second Create or Continue action was used. It stopped at Rights review required.
- **Changed prompt: PASS after final fix.** Entered a distinct silver-train story from that selected project and activated Create once. A separate project appeared while the previous project remained selectable; automatic production completed **10/10** and stopped at Rights review required. No overwritten source project.
- **Existing reuse: PASS.** Selected `October boat verification`, id `23305020-a113-419f-8fd6-bc4051ac94d0`. All three scene IDs/prompts and original filenames were retained. A post-fix rerun's complete displayed scene/asset state was byte-identical before/after reuse (DOM observation), with Character and World references still locked. Existing reference-image forwarding remains unavailable; this is reference preservation, not a model identity claim.
- **Selective regeneration: PASS.** On this new boat test project, marked scene-1 still as Character reference and scene-2 still as World reference (both automatically locked). Regenerated only the unlocked scene-3 still. Scene-1/2 displayed state remained identical; the new scene-3 still was added and the old still/motion filenames remained. The UI explicitly reported that the earlier file was preserved. Broader generated-motion staleness from the earlier reference changes was distinguished from the selective operation. No approved baseline asset was unlocked or regenerated.
- **Imported audio: PASS.** Used only existing verification-media/test-music.wav, a synthetic local fixture, as music. The guarded run stopped at MANUAL **8/11**, then explicit Resolve using local media inspected the import and reached **9/11**; Continue assembled/verified **11/11**. Repeated successfully after the final quick-start fix. This is not generated voice/music or native-audio evidence.
- **Stale result safety observed.** During an earlier reuse run, importing audio changed the project revision while assembly was in progress. The returned result was rejected with stale-dispatch:revision-changed; files remained, technical claims stayed unknown, and explicit replan was required. This deliberate continuation did not silently accept stale verification.
- **Rights gate: PASS.** Successful runs displayed Plan DONE, Create DONE, Verify DONE, Owner Review REQUIRED / Rights review required. The boat project still has 11 asset source/rights records requiring review. Record verified owner review remains disabled. No rights declarations/owner confirmations were fabricated. Publishing remains manual with publishAuthorized:false and automaticPublishingAllowed:false.

## Independent final-file verification

Final post-fix audio-bearing boat export:

`aivm-v2-23305020-a113-419f-8fd6-bc4051ac94d0-1820394d-b74e-49d5-80b5-a86fb6dfc83f.mp4`

Independent FFprobe and /v1/inspect agree with the visible Studio facts:

- 1080x1920; 30/1 FPS; 15.000000 seconds.
- Video codec h264; audio codec aac; MP4 container family mov,mp4,m4a,3gp,3g2,mj2.
- 1,093,464 bytes.
- SHA-256 `D2F5ACAFF21FCE53BB38B76CB72AFE74B8CC0E684C0F2BAE75397F45D8990C31`.

Silent fresh/changed-prompt runs explicitly report audio absent and audio codec unknown. Native generated audio, lip-sync and artistic quality remain unknown. No 4K claim.

## Media and Git preservation

Hashed the 62 files present before this production rerun. After testing: **91 total files, all 62 original hashes identical, 0 changed/missing, 29 additive files**. No reset/clean/reinitialization, main/V1 edit, force push, model download, paid provider, media deletion or private upload. Four stashes remain. No source was changed beyond the genuine quick-start bug fix/test and the five previously preserved capability source/test edits.

## ZIP backup/restore: STILL PENDING — exact owner action

Actual Studio Export complete ZIP packaging ran and reported 4.2 MB, then 4.3 MB after current verification metadata. This is packaging evidence only. Supported browser download-event waits timed out. No new project ZIP was found in Downloads or the task's Documents/Codex and .codex artifact paths using the exact project id. No archive was substituted or fabricated, and restore was not falsely reported as passed.

Owner action requested: with the current boat project selected, manually click Export complete ZIP, complete any save/download UI, then provide the actual saved ZIP path. Do not clear browser data or change rights. Once the file exists, continue the supported browser restore in a separate safe namespace, verify metadata and media blobs, and preserve all existing projects. No need to repeat capability verification or already-passed production unless another code change is required.

Commit/push is pending the remaining ZIP verification gate. If it passes, fetch again, reconcile non-destructively and sync only verified V2 changes to origin/v2-clean-studio without force. No current Git login blocker was observed after scoped network permission was granted.

## Files currently changed

Previously preserved runtime/test fixes: adapter-registry.mjs, generation-route-readiness.mjs, generation-route-readiness.test.mjs, local-workflow-readiness.mjs, local-workflow-readiness.test.mjs (all under v2/).

New runtime/test change: v2/quick-start-ui.mjs and v2/quick-start-ui.test.mjs.

Documentation: v2/WORK_CODEX_HANDOFF.md, v2/WORK_CODEX_CAPABILITY_CHECKPOINT_2026-09-30.md, v2/WORK_CODEX_CAPABILITY_MANUAL_VERIFICATION.md, and this file. Older capability/manual documents describe historical pending states; this checkpoint supersedes those for the items actually completed above.

Local evidence: work/production-2026-10-01-before.json and after.json; production-quick-start-final.log; production-capability-focused-final.log; production-full-final.log. Screenshots/DOM transcripts are in the chat workspace outputs/ directory, including V2-true-one-click-pass-2026-10-01.png/.txt, V2-changed-prompt-pass-2026-10-01.txt and the earlier audio-rights evidence. Keep machine paths/local media private.
