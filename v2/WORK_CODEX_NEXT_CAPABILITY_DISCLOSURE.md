# Work / Codex Next — Capability Disclosure

New additive module: `capability-disclosure.mjs` with tests in `capability-disclosure.test.mjs`.

Goal: keep route availability, quality targets, and verified current-output claims separate. A configured/verified provider route must never be shown as proof that photorealism, native audio, lip-sync, 4K, or similar quality actually succeeded in the current output.

## Local verification

1. Fetch latest `v2-clean-studio` first; do not overwrite newer remote work.
2. Run `node --test v2/capability-disclosure.test.mjs`.
3. Run full V2/bridge regression and six smoke suites.
4. Preserve stricter existing behavior if any current live integration is already more conservative.

## Integration guidance

- Prefer capability-disclosure rows/labels in the capability/status UI after tests pass.
- Keep `FREE ONLY` default and owner approval gate for any future paid-capable mode.
- Route state means route availability only.
- Quality `targetPossible` means the route/capability report says the target may be attempted; it is not output proof.
- `verifiedOutput` requires current trusted evidence from `technical-claim-policy` / `verification-evidence`.
- Stale evidence must not support a current-output claim.
- Unknown must remain unknown; do not convert it to false/unavailable.
- Do not claim 4K/native audio/lip-sync/photorealistic motion from configuration alone.

No V1/main changes, no force push, no paid providers, no model downloads, no destructive changes, and preserve locked/imported media.
