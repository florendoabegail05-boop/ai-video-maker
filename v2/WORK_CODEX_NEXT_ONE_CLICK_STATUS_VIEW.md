# Work/Codex next — One-click status view

Pull the latest `v2-clean-studio` safely and verify the new additive module:

- `v2/one-click-status-view.mjs`
- `v2/one-click-status-view.test.mjs`

Run the targeted test, then the full V2/bridge regression and smoke suites.

If clean, integrate this as a small read-only Studio progress/status panel around the existing one-click flow. Keep the UI honest and compact:

- Plan
- Create
- Verify
- Owner Review

Do not let the view start providers by itself. Live execution must still go through the guarded scheduler/executor path.

Required safety behavior:

- changed project/session => REPLAN REQUIRED
- manual/import blockers stay visible as manual
- technical verification remains separate from rights and owner approval
- manual publish eligibility is never automatic publish authorization
- FREE ONLY remains default
- do not enable paid providers
- do not download large models
- do not delete/overwrite locked or imported media
- do not expose private local paths
- do not touch V1/main
- no force-push

After integration, rerun the full suite and record exact pass/fail counts and commit SHA in the handoff.
