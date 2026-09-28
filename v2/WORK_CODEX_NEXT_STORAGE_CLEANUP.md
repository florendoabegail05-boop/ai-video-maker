# Work/Codex Next — Non-Destructive Storage Cleanup Planner

Read after `v2/WORK_CODEX_HANDOFF.md` and pull the latest `v2-clean-studio` first.

## Chat-side additions

- `v2/storage-cleanup-plan.mjs`
- `v2/storage-cleanup-plan.test.mjs`

This is an advisory-only disk cleanup planner. It does **not** delete media or project records.

## Intended rules

- Locked assets are always protected.
- Character/world reference assets are always protected.
- The selected reusable image/video for a scene is protected.
- The selected project music/voice asset is protected.
- Imported media is preserved by default.
- A cleanup suggestion is only made for an unlocked, stale, derived local media asset when it is not selected/protected.
- `automaticDeletionAllowed` must remain `false`.

## Verify locally

Run:

```powershell
node --test v2/storage-cleanup-plan.test.mjs
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Do not weaken existing preservation tests.

## Integration guidance

If this is later exposed in the UI, use language such as **Review optional cleanup**. Never add a one-click automatic cleanup that deletes files without a separate explicit owner confirmation and a fresh recovery/backup check.

Before any future real file deletion feature:

1. Create a recovery snapshot.
2. Confirm a complete backup or individual export is available for anything the owner wants to keep.
3. Re-check the asset is not locked, referenced, selected in a scene, selected as project audio, or part of a release under review.
4. Show exact filenames/size and require explicit owner confirmation.
5. Delete only the specifically confirmed local file(s), never unrelated directories.

For now, keep this planner read-only.
