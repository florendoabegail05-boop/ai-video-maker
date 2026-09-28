# Work / Codex Addendum — Publishing Readiness

Read this after `WORK_CODEX_HANDOFF.md` and `WORK_CODEX_DELTA.md`.

These chat-side changes are committed on `v2-clean-studio` but are **not locally verified yet**.

## Added

- `publishing-readiness.mjs`
  - Computes a one-place deterministic pre-publish status.
  - Blocking checks: scene plan, eligible clip coverage, deterministic technical QC errors, saved publishing title, and passed final-MP4 fact verification.
  - Captions and project audio are explicitly optional rather than silently required.
  - Human visual/audio review and rights/credits/platform settings are always OWNER ACTIONS.
  - The strongest deterministic state is `OWNER REVIEW REQUIRED`; the app must never call a video auto-approved or auto-publish-ready.
- `publishing-readiness-ui.mjs`
  - Live readiness dashboard in V2.
  - Exportable owner-review checklist JSON.
  - Does not upload or publish anything.
- `publishing-readiness.test.mjs`
  - Tests blocking state, deterministic completion, required owner review, and optional captions/audio behavior.
- `index.html`
  - Loads the new module and exposes the Publishing Readiness panel.

## Run locally

```powershell
node --test v2/publishing-readiness.test.mjs v2/technical-qc.test.mjs v2/final-output.test.mjs v2/publishing.test.mjs v2/core.test.mjs
```

Then run the complete suite already listed in `WORK_CODEX_DELTA.md`.

## Browser verification

1. Confirm all six V2 browser modules load without console errors, including `publishing-readiness-ui.mjs`.
2. Empty/new project must show blocking scene-plan, clip, and final-verification items.
3. A project with all scene clips but no saved final MP4 verification must remain `NOT READY`.
4. A deterministic-complete project must show `OWNER REVIEW REQUIRED`, never `READY TO PUBLISH` or an equivalent auto-approval claim.
5. Missing captions or project audio must remain optional and must not block owner review.
6. Export owner checklist and confirm it contains no local file paths, media bytes, bridge URLs, prompts, or private project history.
7. With duplicate project display names, readiness and checklist export must stay attached to the selected project ID.
8. After changing clips, QC state, title, or final verification, confirm the readiness panel refreshes correctly.

## Safety / product rule

Human review cannot be inferred from metadata. Do not add a synthetic 'passed human review' flag unless the owner explicitly checks/approves it in the UI. No automatic upload/publish action is authorized by this dashboard.
