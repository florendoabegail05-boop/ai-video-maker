# Work / Codex Next — Generated Asset Freshness

Read this after `v2/WORK_CODEX_HANDOFF.md` and `v2/WORK_CODEX_DELTA.md`.

## Newly added in chat

- `generation-freshness.mjs` identifies generated image/video records by provider metadata and marks only unlocked generated media as `needs regeneration` when generation inputs change.
- Imported media (`provider: local-import`) is preserved.
- Locked generated media is preserved by owner choice.
- `core.mjs` now invalidates unlocked generated media for the edited scene when the scene prompt changes.
- `core.mjs` now invalidates unlocked generated visuals across the project when Character / World / Visual Rules guidance changes.
- `references.mjs` now invalidates other unlocked generated visuals when the approved Character/World reference set changes, while preserving/locking the selected reference asset.
- `reusableAsset(...)` already excludes `needs regeneration`, so stale unlocked generated media will no longer be silently reused after those changes.

## Tests added

Run:

```powershell
node --test v2/generation-freshness.test.mjs v2/generation-invalidation-integration.test.mjs v2/core.test.mjs v2/references.test.mjs
```

Then run the complete V2 suite required by the main handoff.

## Browser verification

1. Generate a scene still/clip through the real local route.
2. Edit only that scene prompt. Confirm its unlocked generated still/clip are marked for regeneration and are not reused; unrelated scenes remain untouched.
3. Repeat with the generated asset locked. Confirm it is preserved and remains usable.
4. Import a user image/video, edit the scene prompt, and confirm imported media is not automatically invalidated.
5. Change Character / World / Visual Rules text. Confirm unlocked generated visuals are invalidated, imported and locked media are preserved.
6. Mark an imported image as Character Reference or World Reference. Confirm other unlocked generated visuals become stale while the reference image is preserved and locked.
7. Clear/change the reference and confirm stale state updates without deleting any files.
8. Undo where supported and confirm prior asset status/locks restore correctly.

## Important follow-up

Scene reordering changes continuity context but is **not yet automatically invalidating generated visuals**. Inspect the real Director/continuity behavior before deciding the smallest safe invalidation scope for move operations. Prefer invalidating only scenes whose compiled generation prompt actually changes; do not blindly invalidate the whole project unless necessary.

Do not weaken lock semantics, delete media, or invalidate imported files merely to make tests pass.
