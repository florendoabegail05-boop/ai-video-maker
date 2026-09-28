# WORK / CODEX NEXT — Generation Input Guard

Current branch: `v2-clean-studio`

## What changed

A new generation-input guard now binds image/motion jobs to the exact inputs that matter for generation rather than relying only on project revision or the narrow scene operation guard.

Files:
- `generation-input-guard.mjs`
- `generation-input-guard.test.mjs`
- `one-click-dispatch-envelope.mjs`
- `one-click-dispatch-envelope.test.mjs`
- `one-click-result-processor.mjs`
- `one-click-media-commit.mjs`
- `one-click-media-commit.test.mjs`

The signature includes scene prompt/beat/duration/caption/direction, current AI Director brief (including neighboring story beats), style, hardware mode, Character/World/Visual Rules, reference asset identity/labels/lock state, FREE ONLY route, and the selected motion source image metadata.

It deliberately excludes local source paths and media bytes.

## Required local verification

1. Pull the latest `v2-clean-studio` without force push.
2. Run the new focused tests:
   - `node --test v2/generation-input-guard.test.mjs`
   - `node --test v2/one-click-dispatch-envelope.test.mjs`
   - `node --test v2/one-click-media-commit.test.mjs`
3. Run the complete V2 + local-bridge regression suites and existing smoke tests.
4. Verify browser Studio behavior is unchanged until the live one-click UI/executor is explicitly wired.

## Integration behavior to preserve

- Image/motion dispatches must carry both the existing operation guard and the new generation-input guard.
- A project revision may change for unrelated reasons, but an image/motion result must be rejected when generation-relevant inputs changed.
- Character Bible, World Bible, Visual Rules, approved reference set/labels, scene prompt/direction, neighboring story beat, route, or selected motion source changes must invalidate an in-flight generation result.
- Local path relocation alone must not invalidate a generation result.
- A motion executor must not silently switch to another valid image parent after dispatch.
- Stale generation results should lead to `REPLAN`, not blind retry.
- Never delete stale generated files automatically; leave cleanup/manual recovery to the owner-safe workflow.

## Safety / product constraints

Keep these locked:
- FREE ONLY default.
- No paid provider enablement.
- No model download without explicit owner action.
- No force push or destructive cleanup.
- No overwrite/delete of locked or imported media.
- No private-media upload.
- No automatic publishing.
- V1/main remain untouched.

## Important note

Do not weaken the generation guard merely because the narrower operation guard passes. The new guard exists specifically to catch stale visual generation after bible/reference/director/source-route changes that may leave the scene signature unchanged.
