# Work/Codex next: guarded one-click media commit

Fetch `v2-clean-studio` first and preserve all remote changes. Do not force-push.

## Verify

Run:

```bash
node --test v2/one-click-media-commit.test.mjs
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Then run the existing browser/smoke/real FFmpeg+FFprobe checks if live integration changes.

## New module

`v2/one-click-media-commit.mjs`

Purpose: close the gap between a successful guarded one-click executor result and the existing V2 project asset model.

Required behavior:

- image job success may register a new `image` candidate asset
- motion job success may register a new `video` candidate asset
- registration is additive only; never overwrite/delete existing media
- provider comes from the already-verified FREE ONLY dispatch route
- generated media must have a local path; reject URLs/URI schemes and UNC/network paths
- motion output must reference or derive a current same-scene image parent
- stale/missing/cross-scene motion parents must be rejected
- a successful registration may use existing `core.addAsset`, which intentionally increments project revision
- after that revision change, rebase `session.projectRevision`, `session.plan.projectRevision`, and `session.ledger.projectRevision` so completed one-click progress is preserved instead of forcing a needless replan
- ledger resultAssetIds should record the new registered asset id
- non-media jobs continue through the existing normal result processor
- failed executor results continue through existing retry/failure policy
- never auto-publish, never auto-enable paid routes, never external-upload private media

## Integration recommendation

Wire this only at the local executor result boundary for image/motion jobs:

1. dispatch envelope was already validated
2. executor reports success + local generated path
3. validate media registration before mutating project metadata
4. process guarded success
5. add the new candidate asset
6. rebase one-click session revision metadata
7. continue through current scheduler

Do not expose raw local paths in portable/export/share payloads. The local project may retain the path because existing V2 media playback depends on it.

## Important checks

Confirm that adding media does not:

- reopen completed jobs
- invalidate locked/imported media
- break project integrity cross-links
- permit a remote URL to be stored as generated local media
- permit a stale image to become motion parent
- confuse route availability with quality verification
- grant publishing authority

If tests reveal a mismatch with current live asset-registration behavior, prefer the existing verified core asset schema and adjust this module conservatively. Update the handoff/status with exact test counts and commit SHA after verification.
