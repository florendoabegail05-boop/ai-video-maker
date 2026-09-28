# Work / Codex Next — Resume Checkpoint

New additive files:
- `v2/resume-checkpoint.mjs`
- `v2/resume-checkpoint.test.mjs`

Purpose: give V2 one deterministic resume decision so the app/Work can continue system-fix work without unnecessarily interrupting the owner.

## Local verification

1. Pull the latest `v2-clean-studio` before editing.
2. Run `node --test v2/resume-checkpoint.test.mjs`.
3. Run full `node --test v2/*.test.mjs local-bridge/*.test.mjs`.
4. Browser-check later only after the pure module passes locally.

## Behavior to preserve

- Integrity errors come first.
- Stale unlocked generated media is handled before owner review.
- Publishing-readiness blockers remain system work where possible.
- Owner review/approval/action is surfaced only when deterministic system work is no longer blocking.
- Never auto-regenerate locked/imported owner-preserved media.
- `publishAuthorized` must remain `false`.
- No paid calls, uploads, deletion or destructive changes.

## Suggested integration

When local tests pass, expose a small read-only `Resume from here` / `Next safe action` summary in the V2 UI. Do not wire it to automatic destructive execution. System-fix actions may call existing safe V2 operations only after validating current project/revision state; use the operation guard for async operations.

If the checkpoint says owner interruption is not needed, continue safe system work instead of prompting the owner. Ask the owner only for actual review/approval/manual publish or another genuinely owner-only decision.
