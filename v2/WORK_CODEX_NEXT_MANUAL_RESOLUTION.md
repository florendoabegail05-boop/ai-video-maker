# WORK / CODEX NEXT — Manual media resolution

Branch: `v2-clean-studio`

## Goal
Verify and integrate the evidence-based manual-step resolver so owner-imported local media can satisfy MANUAL one-click jobs without discarding safe progress or weakening stale-input protection.

## New files
- `v2/one-click-manual-resolution.mjs`
- `v2/one-click-manual-resolution.test.mjs`

## Required verification
1. Pull latest branch safely. No force push.
2. Run:
   - `node --test v2/one-click-manual-resolution.test.mjs`
   - the one-click/orchestrator/scheduler/media-commit/retry focused suites
   - full V2 + bridge regression
   - smoke suites used by the current handoff
3. Fix any failures conservatively; preserve V1/main and existing media.

## Behavior to verify
- A session whose project revision changed only because owner media was imported may be rebased only when:
  - project ID matches,
  - no job is RUNNING,
  - job set is unchanged,
  - routes/states/prompts/director briefs/reference IDs still match.
- Any story/generation input drift must return `REPLAN`.
- Manual image job:
  - current reusable local image => mark image job DONE with that asset ID.
  - current reusable local video => mark image and matching motion job SKIPPED so imported clip can flow to assembly.
- Manual audio job:
  - current imported voice/music => mark audio job DONE with those current project asset IDs.
- No local evidence => keep `OWNER_OR_MANUAL_INPUT_REQUIRED`.
- No silent completion: resolver requires explicit resolution request.

## Safety locks
- Metadata only; never deletes or overwrites media.
- Never uploads private media.
- Never enables paid/future providers.
- Never changes FREE ONLY policy.
- Never auto-publishes; `publishAuthorized:false` remains mandatory.
- Never rebase while an async job is still RUNNING.
- Preserve locked/imported media exactly.

## Integration target if tests pass
Wire this into the live one-click/manual-import UX after an owner import completes. The UI may offer “Use imported media and continue” only when current project evidence satisfies the manual job. Do not provide a generic “mark complete anyway” path.

If imported media changes project revision, use the safe rebase function first. If it returns REPLAN, rebuild the one-click session rather than copying ledger state blindly.
