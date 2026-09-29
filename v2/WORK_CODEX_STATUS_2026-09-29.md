# Verified local reconciliation — 2026-09-29

Integration commit: `af5c37203fea58c6cc149b89ca2dfbc7187709cf`.
Authoritative remote base: `9c2cf6811b248023f26b174583dcf402ae830d93`.
Branch: `v2-clean-studio` only. This status is recorded in a separate documentation commit after the integration commit.

## Preservation and reconciliation

Inspected status, tracked/untracked changes and the existing stash before fetching. Confirmed the expected remote HEAD. Preserved all current integration files in a second named stash, fast-forwarded the existing checkout, and applied that stash without dropping it. No reset, clean, force push, workspace recreation, main/V1 edits or media deletion was used.

Preserved stashes:
- `ca45c222e297f8821ff50f9158ff96dba720bd03`: Preserve unfinished evidence UI before authoritative master batch aaf8010.
- `6e6e6b3cfabef22980b0bd88c4735b9c72b30057`: Preserve current one-click Studio integration before remote 9c2cf68 reconciliation.

The older evidence-UI stash remains a recovery copy; its parallel evidence helper was not substituted for the newer remote fact/release modules. Three overlapping files were reconciled by comparing both implementations: remote retry classification and stale-motion precedence already include the local fixes; the remote whitelist-only publishing snapshot/export sanitizers remain unchanged. Live machine fact sets remain in the local one-click session, not added back into portable publishing snapshots. All newer remote privacy, revision, path, integrity and codec safeguards are retained.

## Actual test results

- Checklist `WORK_CODEX_NEXT_REMOTE_FIXES_AFTER_328.md`: **146 passed, 0 failed, 0 skipped**, 3.884 seconds (20 suites/files; Node reports 0 test suites because these are top-level tests).
- Full `node --test v2/*.test.mjs local-bridge/*.test.mjs`: **380 passed, 0 failed, 0 skipped**, 22.644 seconds.
- Master-batch focused files: **134 passed, 0 failed, 0 skipped**, 3.689 seconds.
- Additive-media follow-up focused files: **22 passed, 0 failed, 0 skipped**, 1.364 seconds.
- All six `tests/*.smoke.js` scripts passed: automatic-production, creator-director, future-proof, hardware-routing, media-engine, quality-engine.
- Real 1080x1920 caption/audio render test passed with actual FFmpeg/FFprobe 9.0.2, including independent stream inspection and bridge metadata comparison. No render tests were skipped.
- Git whitespace checks passed. No existing assertions were relaxed or removed.

Intermediate results are not the final baseline: initial reconciled full regression passed 378/378. Two added evidence-boundary tests increased the count to 380. One new assertion initially expected a null raw browser FPS field; inspection confirmed the browser module deliberately omits that unsupported field entirely. The test now explicitly verifies absence from both raw facts and evidence, while the public manifest remains null/unknown. Final counts above are from the corrected rerun.

## Live Studio results

Uses the existing createOneClickSession -> status view -> guarded dispatch -> local executor -> guarded media/result commit -> machine verification -> completion -> verified owner-review modules. No duplicate scheduler or release architecture was created.

- Saved failed job survived reload as FAILED; final verification and owner approval remained unavailable. Explicit retry succeeded after correcting the executor's provider labels to the actual bridge response contract (`fallback` / `motion-fallback`). Real bridge tests now assert those labels, and hidden provider switching remains rejected.
- Silent test project: **10/10 required jobs DONE**, three newly generated still/motion pairs registered additively with exact parent binding, final technical gate passed, then **Rights review required**. Audio stream verified absent; audio codec remains unknown without creating a false blocker.
- Audio-bearing test project: **11/11 required jobs DONE**. Execution stopped at the required manual audio step (8/11), resolved only from the previously imported local track after file inspection (9/11), then assembled and verified. Correct final stop: **Rights review required**, 18 provenance records still needing owner review. Owner-review checkboxes/button remain disabled.
- No owner confirmations were fabricated. `publishAuthorized:false` and `automaticPublishingAllowed:false` remain in the UI and release modules. Publishing is manual only.
- Caption edit after successful silent render made final verification STALE, one-click continuation required replan, and old facts became UNKNOWN. Switching to the other project with the identical display name retained its separate current audio-bearing verification.
- Browser console errors captured after the final runs: **0**.
- All **7 original test-media SHA-256 hashes** still match; 33 files now exist after additive generations/exports. Original, imported and locked media were preserved.

Independent FFprobe and `/v1/inspect` agree with the browser machine-fact display:

| Render | Size | Duration | Video | Audio | SHA-256 |
| --- | ---: | ---: | --- | --- | --- |
| Silent browser run | 713665 bytes | 15.000000 s | 1080x1920, 30/1 FPS, h264 | no audio stream | 73B68EAC3D2E671FFA71149ED331C2818C5BB7FA6963A10413D66D307568F648 |
| Audio browser run | 1103175 bytes | 15.000000 s | 1080x1920, 30/1 FPS, h264 | aac | 2E59128BE71DD1D7CC8DFCC91848F3F6F042269A23199BC3181120A71B9E7183 |

These are technical file facts only. Native generated audio, lip-sync, artistic quality and 4K generation are not claimed.

## Safety verification

Passing tests cover optional jobs not blocking completion, failed jobs not becoming success, stale results rejected, resultAssetIds surviving metadata-only updates, exact motion-parent binding, absolute-local path policy, browser-only evidence unable to mint technical stamps, current machine width/height/duration required, audio codec required when requireCodecs is true and audio exists, changed technical/provenance/release inputs staling approval, portable privacy and rights-review blocking. Generated media registration remains additive. No automatic retry, paid fallback, large download or publishing was enabled.

## Files changed by the integration

- `v2/one-click-studio.mjs` (new live UI glue)
- `v2/one-click-local-executor.mjs` and `.test.mjs` (new guarded local I/O adapter and seven tests)
- `v2/studio.mjs` (connect existing Create draft action)
- `v2/local-provider.mjs` (mock status, current output path and local inspection)
- `v2/draft-job-plan.mjs` (explicit OPTIONAL unrequested captions)
- `v2/one-click-dispatch-envelope.mjs`, `v2/one-click-result-processor.mjs` (scene/route binding)
- `v2/final-output.mjs`, `.test.mjs` (browser/machine fact boundary)
- `v2/final-1080p.test.mjs` (explicit bridge evidence and actual response labels)

Documentation changes: this file and `WORK_CODEX_HANDOFF.md`.

## Remaining owner-controlled work

No model route was enabled. Live capabilities still report no configured ComfyUI workflow, no image/video/voice/audio model runners, and reference forwarding disabled. Basic fallback stills and FFmpeg camera motion are usable but are not generative-model quality. Hardware remains AMD A12-9720P, four logical CPUs, 7.4 GiB RAM (about 0.9 GiB free); GPU details remain unknown. Supply an existing compatible workflow/model or explicitly approve a specific model download before mapping nodes or enabling new local AI routes. Never guess node IDs; unsupported workflows receive zero reference paths.

Rights/source/credit review and explicit final owner confirmations are still required before verified owner approval. This is the intended release stop, not a failed render. No owner action is needed merely to sync this verified integration. Earlier complete-ZIP clean-namespace restore and in-app-browser download-completion limitations remain separate follow-ups and are not claimed newly completed here.
