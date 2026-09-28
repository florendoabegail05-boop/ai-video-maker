# Work / Codex Next — Edit Impact Preview

This file was added chat-side while Work/Codex may be operating concurrently. Do not assume it has been locally executed yet.

## New additive module

- `v2/edit-impact.mjs`
- `v2/edit-impact.test.mjs`

Purpose: preview which generated assets are affected by an edit **before** invalidation/regeneration, without mutating the project.

Supported previews:

- scene prompt edit → unlocked generated visuals in that scene only;
- Character/World/Visual Rules change → all unlocked generated visuals;
- Character/World visual reference change → all unlocked generated visuals while preserving imported/locked assets;
- scene reorder → continuity-review scope from the earliest moved position onward, but `autoInvalidate:false` until real local prompt/continuity behavior is verified.

## Safety behavior

- Imported media is never included as auto-regeneration target.
- Locked generated visuals are reported separately as preserved.
- Preview functions do not mutate the project.
- Scene reorder is intentionally review-only; do not turn it into automatic invalidation without proving the correct scope with real compiled-prompt tests.

## Verify locally

Run:

```powershell
node --test v2/edit-impact.test.mjs v2/generation-freshness.test.mjs v2/generation-invalidation-integration.test.mjs v2/core.test.mjs
```

Then run the full V2 suite before calling this verified.

## Browser/integration follow-up

If tests pass, consider a lightweight **Before this edit** impact message in the live Studio. Do not add a blocking confirmation dialog for routine edits unless usability testing shows it helps. Preferred UX is a compact notice such as:

- `This scene edit will mark 2 unlocked generated assets stale. 1 locked asset will be preserved.`
- `Moving this scene changes continuity context for scenes 2–6. Review those generated visuals after the move.`

Do not expose raw local paths or private prompt contents in the impact message.

## Scene reorder acceptance check

Create a 4-scene project and compare `compileScenePrompt(...)` before/after moving scene 3 earlier. Determine exactly which scene prompts change because of prior/next continuity context. Use that evidence to decide whether future auto-invalidation should affect:

- only the swapped pair,
- all scenes from the earliest moved position onward,
- or another smaller deterministic set.

Until that is proven, keep reorder behavior review-only and non-destructive.
