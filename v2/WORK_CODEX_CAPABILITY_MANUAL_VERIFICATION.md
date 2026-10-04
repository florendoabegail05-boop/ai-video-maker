# Manual browser evidence still required

This checklist is pending, not a record of passing browser tests. It applies to remote base `46743a6262fe092e0da0a4920bd65ad14337860b` plus the preserved local capability fixes. Automated browser access is explicitly policy-blocked. Do not bypass that policy with another browser, automation framework, CDP, or indirect page execution.

The supported launcher is `node v2/start.mjs`. The existing verification session uses AIVM_V2_WEB_PORT=8094 and its existing verification-media root. Studio responded HTTP 200 and the non-mock bridge /health responded successfully on 8787 after restart. Keep the same origin so the saved browser projects remain accessible; do not clear site data. HTTP success is not visual verification.

## 1. Capability panel (no project edits needed)

- [ ] Refresh the existing http://127.0.0.1:8094/v2/ tab and confirm AI Video Maker V2 is visible, not ERR_CONNECTION_REFUSED.
- [ ] In FREE ONLY Adapter Registry, click **Check verified adapters**. Confirm the button re-enables and the status says the registry and generation readiness refreshed from the local bridge.
- [ ] Capture the **What this setup can create now** heading and all its rows. Expected from the currently inspected real bridge:
  - IMAGE: DRAFT_ROUTE_READY; local draft still, model-backed generation not verified.
  - VIDEO: DRAFT_ROUTE_READY; local FFmpeg camera motion, generative motion not implied.
  - VOICE, MUSIC, SFX: IMPORT_ONLY, generation not verified.
  - LIPSYNC: UNAVAILABLE.
  - CHARACTER/WORLD REFERENCES: NOT VERIFIED; no verified local image workflow configured.
- [ ] Confirm the note does not claim downloads, paid providers, automatic publishing, artistic quality, photorealistic output, native generated audio, or 4K proof.

## 2. Required production rerun after the adapter fix

Use a new, clearly named verification project. Preserve all previous projects, imports and locked assets. Do not turn owner-rights confirmations into test data.

- [ ] Enter a distinct three-step test story, set duration to 15 seconds and hardware to Light laptop. Click **Create video · FREE ONLY**. Record project name, scene count and displayed progress. Example story: "A red paper boat rests beside a garden pond. The boat drifts under a wooden footbridge. The boat reaches a bed of yellow flowers."
- [ ] Confirm Plan -> Create -> Verify advances only after successful required work. Record the exact required-job numerator/denominator; the prior three-scene silent baseline was 10/10, but do not mark a different count passed solely because it resembles that baseline. FAILED, BLOCKED, MANUAL or stale required entries must not be counted as successful. Optional jobs must not block completed required work.
- [ ] Verify a final MP4 download link appears and the technical facts identify their trusted bridge/FFprobe source. Unknown browser facts must remain unknown. Do not infer codec/FPS/audio from appearance alone.
- [ ] For audio coverage, use only the already-present synthetic `test-music.wav` in work/verification-media via **Import audio** and **Music / ambience**. This tests imported audio, not generated music or speech. On this new test project, start a fresh guarded plan if required. When audio is MANUAL, click **Resolve using local media: [audio job]**, then **Continue one-click**. Record inspection success and final required-job counts (prior three-scene audio baseline 11/11).
- [ ] Confirm a successful render/technical verification stops at **Rights review required**. Capture that headline, Plan/Create/Verify/Owner Review states, technical facts, and unresolved rights details.
- [ ] Confirm **Record verified owner review** and owner confirmation controls remain disabled while rights are unresolved, and the page says `publishAuthorized: false` and `automaticPublishingAllowed: false`. Do not confirm rights, record approval, or publish as part of this test.
- [ ] If a real failure occurs, record it unchanged. Verify there is no automatic retry. Only use an explicit Retry action for a retryable failure; missing capabilities, stale plans, login or rights requirements must remain blocked. Do not manufacture a failure by altering permissions or production files.

## 3. Preservation and freshness spot checks (new test project only)

- [ ] Change the main story prompt and create again; confirm a separate project appears and the previous one remains selectable.
- [ ] On the test project, exercise Keep, Lock and Unlock on test assets. Mark test images as Character/World references and observe the lock; this does not enable reference-path forwarding.
- [ ] Regenerate one eligible unlocked test asset. Confirm a new asset is added, the original remains, other scene assets remain, and the replacement motion uses the matching current source still. Never regenerate or unlock an approved baseline asset for this check.
- [ ] After a successful final verification, edit a test scene caption or render input. Confirm verification becomes stale/replan is required. A stale result must not become an approval stamp. Reordering and reference/prompt edits must preserve locked/imported media even when eligible generated dependents become stale.
- [ ] Create a metadata recovery snapshot on the test project, change its caption, then restore that snapshot. Confirm the caption returns, a before-restore safety point exists, and original media remains available.
- [ ] Export test project metadata/ZIP and record that a real download exists. Do not overwrite an existing project to test restore; leave restore verification pending if a safe separate test target is not available. Prior backup/restore evidence remains historical until repeated.

## What to return / completion boundary

Return screenshots of the capability rows and final production/technical/rights state, exact displayed counts, any error text, and which checkboxes were actually exercised. A screenshot alone does not prove interactions that preceded it. These are owner-performed manual observations, not automated-browser test passes. Leave unperformed checks explicitly pending.

Codex can independently inspect the resulting local final MP4 with FFprobe and the bridge without controlling the browser. A new output must be identified before making claims about it. Do not upload private media externally. Once the required manual evidence is satisfactory, fetch again, reconcile without discarding changes, and commit/push verified V2 fixes only to v2-clean-studio. No force push. Until then, preserve the uncommitted fixes and four existing stashes.
