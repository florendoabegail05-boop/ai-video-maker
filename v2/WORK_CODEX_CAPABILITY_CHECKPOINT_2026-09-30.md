# Capability verification checkpoint — 2026-09-30

Status: local fixes preserved; browser verification blocked; not committed or pushed.

## Follow-up: local verification completed without browser access

Following the owner's request to continue non-browser work, fetched the branch again successfully; actual remote HEAD is still `46743a6262fe092e0da0a4920bd65ad14337860b`. No concurrent source changes need reconciliation. No further runtime source changes or unrelated features were added. The 43-focused / 419-full checkpoint and six passing smoke scripts remain the last test executions; their logs were checked, not relabeled as newly rerun tests.

The previously stopped Studio web server has been restored using the supported `node v2/start.mjs`, AIVM_V2_WEB_PORT=8094, the existing media root, and portable FFmpeg/FFprobe on PATH. The idle standalone bridge was stopped before the combined launcher started, avoiding a port conflict. Current independent HTTP checks: Studio /v2/ returns 200; bridge /health returns ok, mock:false, concurrency=1, retries=0, no queued/active jobs. No firewall/admin change was needed. Automated browser access was retried after server recovery and still received the explicit URL-policy denial. This confirms a distinct browser-tool blocker remains after fixing connection refusal.

Read-only independent FFprobe inspection of the preserved audio-bearing baseline export `aivm-v2-22932336-4c2e-440e-b921-a3f75385ace8-a59a908c-dba3-4be4-98d0-174962e8387c.mp4` agrees with current /v1/inspect: **1080x1920, 30/1 FPS, 15 seconds, h264 video, aac audio, 1,090,546 bytes**. SHA-256 remains `2CE279F2ED982E0710E9B7E5E392E37F13D902A52758A9EEA2B7F36402D01211`. This is a reinspection of an existing output, not a new browser render or evidence of generated speech/native audio. All 62 media hashes still match the pre-fix snapshot; all four stashes remain.

Reviewed the existing capability display and one-click integration against the pending requirements: the capability display calls generationRouteRows; required success and verified release preflight gate owner review; manual media resolution inspects local files; retries require explicit user action. Existing regression coverage includes stale results, additive registration, exact motion parent binding, current machine evidence, provenance/release staleness, legacy-approval rejection and manual publishing. No additional actual failure was found requiring a code change. This static review does not substitute for visible browser behavior.

Remaining owner-performed evidence is specified in `WORK_CODEX_CAPABILITY_MANUAL_VERIFICATION.md`: capability panel rows and the production/manual-audio/technical/rights flow, with preservation and freshness checks. All checklist items start pending. No browser policy was weakened or bypassed. Commit/push remains pending that verification gate; no Git login blocker remains after the scoped network permission grant.

## Git and preservation

Fetched `origin/v2-clean-studio` before the work and again before this checkpoint. Local HEAD and actual remote HEAD both remain `46743a6262fe092e0da0a4920bd65ad14337860b`. The current complete checkout was fast-forwarded from the verified baseline, not recreated. All four existing preservation stashes remain. Main/V1 and the original saved folder were not changed. All 62 existing verification-media files have identical SHA-256 hashes before/after this run.

## Narrow fixes and observed failures

Four added tests initially produced 16 passed / 4 failed in the two new module suites. Minimal fixes now:

- Suppress reference-forwarding/support claims from mock capability reports.
- Require FFmpeg/FFprobe evidence (and no explicitly missing libx264) even for an explicitly named, verified motion-fallback route.
- Require an explicit endpoint for ComfyUI manifests; local-process manifests may still omit it.
- Accept the actual WHATWG URL hostname form `[::1]` for IPv6 loopback, while retaining all four mandatory runtime evidence checks.

Existing assertions were retained. No new provider, model, download, publishing permission, or reference mapping was enabled.

## Actual test results

- New generation-readiness + local-workflow suites: **20 passed, 0 failed, 0 skipped** (2.561 seconds).
- All seven focused suites listed in WORK_CODEX_NEXT_CAPABILITY_DISCLOSURE.md: **43 passed, 0 failed, 0 skipped** (3.034 seconds).
- Full `node --test v2/*.test.mjs local-bridge/*.test.mjs`: **419 passed, 0 failed, 0 skipped** (62.229 seconds).
- All six existing smoke scripts passed: automatic-production, creator-director, future-proof, hardware-routing, media-engine, quality-engine.
- Real non-mock bridge generation/assembly test passed: fallback still, FFmpeg motion, captions plus test audio, final 1080x1920 MP4. Independent FFprobe confirms 30/1 FPS and an audio stream; bridge inspection agrees on duration and byte size. Portable manifest verification passed. The test cleans up only its own temporary fixture directory. This run did not separately record final codec names, and does not claim them from browser evidence.
- `git diff --check` passed.

The prior 399-test baseline is included in the passing full regression. Its browser production guarantees were not re-certified in this run.

## Live laptop evidence (API/module, not visual UI verification)

The previous bridge was no longer listening. Started the real local bridge against the existing verification-media directory, concurrency 1 and retries 0. Live `/v1/capabilities` reports `mock:false`, FFmpeg/FFprobe 9.0.2 available, no configured/reachable ComfyUI, and no configured image/video/voice/audio runners. Evaluating generationRouteReadiness with that actual response gives:

| Stage | State | Route/mode |
| --- | --- | --- |
| Image | DRAFT_ROUTE_READY | image:fallback / local-draft |
| Motion | DRAFT_ROUTE_READY | video:motion-fallback / ffmpeg-draft-motion |
| Voice | IMPORT_ONLY | import-only |
| Music | IMPORT_ONLY | import-only |
| SFX | IMPORT_ONLY | import-only |
| Lip-sync | UNAVAILABLE | unavailable |

Reference forwarding is disabled for both Character and World: `No verified local image workflow is configured.` All quality-target flags in this actual readiness result are false. No model generation, native audio, identity consistency, 4K output, or artistic quality is claimed.

Inspected the existing Comfy Desktop local CPU installation's nested ComfyUI/models tree: zero files with model extensions safetensors/ckpt/pt/pth/onnx/gguf/bin; its user/default/workflows directory does not exist. This is scoped to the inspected installation, not a machine-wide absence claim. No compatible existing workflow/model was found or exercised. The local-workflow readiness contract passes tests, but no live model has the required workflow readability, reachable runner, model files, and independently probed output evidence. GPU details remain unknown in the live report. No node IDs guessed or model enabled.

## Required remaining verification and exact blocker

The browser tool rejected selection of the existing `http://127.0.0.1:8094/v2/` tab with: `Browser Use rejected this action due to browser security policy` and `The browser URL policy blocks this action ... The requested URL protocol is not allowed. Allowed protocols: "http:", "https:".` This is the returned rejection even though the requested URL uses HTTP. It explicitly prohibits alternate browser surfaces, indirect execution, raw CDP, and workarounds. No workaround was attempted.

Therefore the visible capability panel and full One Prompt -> Plan -> Create -> Audio -> FFmpeg -> Final Verification -> Rights Review browser rerun are **not verified**. The adapter routing fix makes that production rerun required. Restore permitted browser-tool access to the existing local Studio page before continuing. Then visually check the capability panel, rerun the full production flow using only existing local audio, confirm the Rights review required stop, fetch/reconcile again, and commit/push only to v2-clean-studio without force.

No commit/push was attempted for these pending fixes. There is no current Git authentication/permission failure; the release verification gate is blocked by browser policy. Owner approval and publishing remain untouched.

## Changed files / resume

- v2/adapter-registry.mjs
- v2/generation-route-readiness.mjs
- v2/generation-route-readiness.test.mjs
- v2/local-workflow-readiness.mjs
- v2/local-workflow-readiness.test.mjs
- v2/WORK_CODEX_HANDOFF.md (checkpoint pointer only)
- v2/WORK_CODEX_CAPABILITY_CHECKPOINT_2026-09-30.md (this record)
- v2/WORK_CODEX_CAPABILITY_MANUAL_VERIFICATION.md (pending manual observations)

Logs remain beside the checkout in work/: capability-boundary-baseline.log, capability-focused-final.log, capability-modules-final.log, capability-full-final.log. capability-live.json records the local response; capability-media-before.json records the preservation hashes. Keep those local machine-path-bearing evidence files out of portable publishing output. Continue this exact workspace and retain all current changes/stashes.
