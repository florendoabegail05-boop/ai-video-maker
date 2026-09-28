# Work/Codex next — Owner action queue

Additive chat-side milestone. Do not restart the project.

Files:
- `v2/owner-action-queue.mjs`
- `v2/owner-action-queue.test.mjs`

Purpose: reduce owner interruptions by separating genuine owner review/approval/publish actions from work the app/Work should handle itself.

Local verification:
1. Pull latest `v2-clean-studio`.
2. Run `node --test v2/owner-action-queue.test.mjs`.
3. Run full `node --test v2/*.test.mjs local-bridge/*.test.mjs` plus smoke tests.
4. Fix real regressions without weakening assertions.

Integration guidance after tests pass:
- Add a compact Owner Actions panel only when the queue contains genuine owner-review/owner-approval/owner-action items.
- Do not interrupt the owner for `system-fix` items when the app/Work can handle them.
- Never turn `manual-publish` into automatic publishing. `publishAuthorized` must remain false until there is a separate explicit publish command and supported action.
- Cleanup suggestions are advisory only; never auto-delete.
- Backup warnings must not silently upload/share the private ZIP.
- Keep FREE ONLY and preserve locked/imported assets.

If the live Studio is being edited concurrently, integrate only after refetching current SHAs and resolving conflicts conservatively.
