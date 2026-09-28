# Work/Codex next: final verification gate

Pull the latest `v2-clean-studio` safely before editing. Do not force-push.

## Verify

Run:

- `node --test v2/final-media-facts.test.mjs v2/final-verification-gate.test.mjs`
- full `node --test v2/*.test.mjs local-bridge/*.test.mjs`
- the existing smoke suites

## Review integration

Inspect the current final render / FFprobe verification flow and integrate `final-verification-gate.mjs` only if it preserves or strengthens existing behavior.

The gate should be fed current render-bound browser/FFprobe/bridge facts. Use FFprobe/bridge for stream/FPS/codec/container facts. Browser-only evidence must never establish those claims.

Expected default portrait output is 1080×1920 unless the active verified export preset explicitly requests another tested size. Do not advertise 4K merely from a route declaration; current rendered dimensions must be verified separately.

Audio-stream verification means only that an audio stream exists. It must not be relabeled as native generated audio, good mix quality, voice quality, or lip-sync quality.

If browser and machine facts contradict, surface the contradiction and require re-inspection. Never silently choose the more flattering result.

Stale render-bound facts must not pass the gate after render inputs change.

Keep this gate technical-only. Rights/provenance, owner approval, publishing readiness, platform eligibility, and artistic QC remain separate gates. `publishAuthorized` must stay false here.

## Safety

- FREE ONLY remains default.
- Do not auto-enable paid providers.
- Do not auto-download large models.
- Do not delete or overwrite owner media.
- Preserve locked/imported assets.
- Do not touch V1/main.
- No force push.
- Do not upload private media.
- Stop for login/CAPTCHA/admin/owner approval.

If integration is safe, update the live verification/readiness UI to show exact PASS/BLOCKED/INFO reasons rather than flattening unknown to false. Record exact test counts, smoke results, any real FFmpeg/FFprobe render checks, and the final commit SHA in the handoff.
