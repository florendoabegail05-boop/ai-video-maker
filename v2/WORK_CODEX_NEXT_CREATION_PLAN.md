# Work / Codex Next — Creation Plan

Branch: `v2-clean-studio`

New additive files from ChatGPT:
- `v2/creation-plan.mjs`
- `v2/creation-plan.test.mjs`

Purpose: give the Studio one deterministic FREE ONLY execution plan for the owner's actual creation flow instead of scattering route decisions across multiple panels.

## Verify first

1. Fetch latest remote before edits.
2. Run:
   - `node --test v2/creation-plan.test.mjs`
   - `node --test v2/*.test.mjs local-bridge/*.test.mjs`
   - existing smoke/browser checks if live integration changes are made.
3. Preserve stricter existing behavior if anything conflicts.

## Intended behavior

The planner separates these stages:
- AI Director
- scene images
- motion
- audio
- captions
- final FFmpeg assembly
- FFprobe final verification

Rules:
- FREE ONLY is hard-coded for this planner.
- No image route => image generation blocker, but owner import remains a valid fallback.
- No generated audio route => manual/import fallback, not a false blocker.
- No AI motion route => optional imported-clip path, unless another live rule intentionally requires generated motion.
- FFmpeg and FFprobe availability are independent final-output checks.
- The nested capability disclosure must remain honest: route availability is not proof of achieved quality.

## Suggested live integration

After tests pass, consider using `buildCreationPlan()` in a small "What can I create now?" / creation readiness UI near the one-click creator. Keep this advisory and capability-derived; do not auto-install dependencies or models.

If wiring a Create button, do not blindly execute all stages. Respect existing async guards, locked/imported assets, selective regeneration, operation cancellation/staleness rules, and the owner's ability to stop after any asset stage.

## Do not do

- Do not enable paid APIs/providers.
- Do not auto-download large models.
- Do not change main/V1.
- Do not upload owner media.
- Do not delete or replace locked/imported assets.
- Do not call a route "photorealistic", "native audio", "lip-sync", or "4K" merely because it is configured.

Record exact local pass/fail counts and any integration commit in the existing handoff/status after verification.
