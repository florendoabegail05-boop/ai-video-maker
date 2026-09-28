# Work / Codex Next — Asset Provenance Review

Read this after `WORK_CODEX_HANDOFF.md` and the newest NEXT files.

Chat-side additive work added:
- `asset-provenance.mjs`
- `asset-provenance.test.mjs`

Purpose: record owner-supplied source/rights-review metadata per asset without pretending the app can determine copyright/licensing legality automatically.

## Verify locally first

Run:

```powershell
node --test v2/asset-provenance.test.mjs
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Do not weaken existing tests to make this pass.

## Expected behavior

1. Existing imported assets infer origin `imported` but rights status remains unknown until owner records it.
2. Existing local-generated assets infer origin `local-generated` but are **not** automatically marked publishable or legally cleared.
3. Explicit owner metadata supports:
   - origin: owner-created / local-generated / imported / licensed / public-domain / unknown
   - rightsStatus: owner-confirmed / license-confirmed / public-domain-confirmed / needs-review / unknown
   - source label, credit, note
4. Unknown/unrecognized values fall back to review-required rather than being upgraded.
5. Portable summary must never include `sourcePath`, private prompts, bridge URLs or media bytes.
6. Setting provenance must not alter lock/status/media source fields.

## Safe future integration

After the latest live Studio files are pulled and verified, consider adding an **Asset Source & Rights Review** UI near Project Assets. Integration rules:

- use `revise(...)` + `saveProject(...)` when persisting provenance edits;
- preserve stable project ID selection;
- do not require a legal determination from the app;
- never label an asset `safe`, `copyright-free`, `licensed`, or `publishable` unless the owner explicitly supplied the corresponding record;
- imported/generated origin alone is not rights confirmation;
- rights review can become an owner-review checklist item, but should not silently delete/block unrelated editing work;
- publishing handoff may include portable provenance summary only—never local paths/private media data.

## Browser checks after integration

- record owner-created metadata for one imported asset;
- record license-confirmed metadata plus credit for another;
- leave one asset unknown and verify the dashboard still flags owner review;
- reload/reselect duplicate-named projects and confirm metadata remains on the correct project ID;
- export portable provenance summary and inspect it for local paths/private prompt leakage;
- confirm no media file, lock, reference role, selected clip, or source path changes when provenance metadata changes.

No paid provider, large download, upload, install or destructive action is required for this milestone.
