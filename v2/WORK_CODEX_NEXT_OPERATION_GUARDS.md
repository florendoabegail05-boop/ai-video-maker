# Work / Codex — Next: Async Operation Guards

This file was added from chat while Work/Codex may be editing other V2 files. It is intentionally additive to reduce merge conflicts.

## Why this exists

V2 already checks project ID/revision in several async browser flows, but generation, animation, imports, final assembly and future provider calls can finish after the user has edited the project. The new pure module `v2/operation-guard.mjs` provides a reusable stale-result guard without changing live Studio behavior yet.

## Added

- `v2/operation-guard.mjs`
- `v2/operation-guard.test.mjs`

The guard can capture:
- project ID and revision;
- render signature;
- optional scene signature;
- optional target asset ID and its lock state.

It rejects results when:
- the selected project changed;
- the guarded revision changed unless the caller explicitly allows unrelated revisions;
- the guarded scene changed or disappeared;
- the target asset disappeared or became locked after the operation began;
- render inputs changed when `requireRenderMatch` is requested.

It does not delete, unlock, replace or mutate any media.

## Verify first

```powershell
node --test v2/operation-guard.test.mjs
```

Then include it in the full V2 test run.

## Integration checks before wiring into Studio

1. Inspect current `v2/studio.mjs` after pulling latest branch. Do not overwrite newer Work/Codex changes.
2. Compare existing manual `current.id` / `current.revision` checks with `operation-guard.mjs`.
3. Integrate only where it makes stale async results safer without blocking unrelated safe edits.
4. For scene image generation / animation, prefer a scene-scoped guard.
5. For final assembly, require render-signature match.
6. For regeneration targeting an existing asset, reject the returned result if the owner locked that asset while the operation was running.
7. Test two duplicate-named projects and prove an async result can never land in the wrong project.
8. Test editing another unrelated scene during a scene-scoped operation. If safe, `allowUnrelatedRevision:true` may be used only after proving the guarded scene did not change.
9. Preserve all generated/imported files even when a stale result is rejected from project metadata; never delete a file merely because the UI result became stale.

## Safety rules

- FREE ONLY remains the default.
- Preserve V1/main.
- No paid providers, large model downloads, admin installs or private-media uploads without owner approval.
- Do not weaken existing project/revision safety checks just to use this helper.
- If current Work/Codex changes already solve a case more strictly, keep the stricter behavior.
