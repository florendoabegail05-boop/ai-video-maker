# WORK/CODEX NEXT — Draft Job Plan

Chat added an additive one-click draft execution blueprint:

- `v2/draft-job-plan.mjs`
- `v2/draft-job-plan.test.mjs`

## First

Fetch/pull the latest `v2-clean-studio` safely. Do not force-push or discard remote work.

Run:

- `node --test v2/draft-job-plan.test.mjs`
- then the full V2/bridge regression and smoke suites.

## Intent

This module converts the current project + verified FREE ONLY capability report into an ordered execution blueprint:

AI Director → per-scene image → per-scene motion → project audio → captions → final assembly → final FFprobe verification.

It is planning only; it must not itself call paid providers, delete media, publish, or mutate the project.

## Integration guidance

After tests pass, inspect the current Studio flow before wiring anything.

Suggested conservative integration:

1. Show a compact “Draft creation plan” / “What can I create now?” panel.
2. Use the job plan only to decide which existing verified action is available next.
3. Before applying any async image/motion result, keep the existing project/scene/asset stale-operation guard. Do not weaken stricter current checks.
4. Preserve locked/imported media and owner-selected references.
5. Treat image generation as MANUAL when no verified FREE ONLY image route exists.
6. Treat missing generated audio as import/manual fallback, not a reason to fabricate a route.
7. Final assembly requires FFmpeg; trusted final verification requires FFprobe.
8. Do not auto-start a chain that could overwrite accepted media. Each job should remain independently reviewable/retryable.

## Important local verification

Exercise in browser with:

- a project with 2+ scenes,
- verified image fallback or Comfy route,
- FFmpeg/FFprobe available,
- generated audio unavailable,
- a second run where image route is unavailable,
- existing locked/imported scene media present.

Confirm the plan never replaces locked/imported assets and does not expose paid routing.

If integrating an actual “Create draft” sequence, preserve existing selective regeneration behavior and operation guards. A stale result should be rejected from project metadata application without deleting the produced local file.

Update handoff/status with exact test counts and commit SHA.
