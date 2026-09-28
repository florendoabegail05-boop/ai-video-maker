# Work / Codex — Technical Claim Policy

Chat-side additive files:
- `v2/technical-claim-policy.mjs`
- `v2/technical-claim-policy.test.mjs`

Purpose: keep V2 capability/output labels evidence-based. Unknown must stay unknown; stale or untrusted browser evidence must not become a positive or negative technical claim.

## Local verification

1. Fetch latest `v2-clean-studio` safely; no force-push.
2. Run:
   - `node --test v2/verification-evidence.test.mjs v2/technical-claim-policy.test.mjs`
   - full V2/bridge regression
   - six smoke suites
3. If verified, integrate conservatively with the live capability/final-output/publishing UI.

## Integration rules

- Use FFprobe/bridge-class evidence for stream/FPS/codec/bitrate/native-audio/4K-style claims.
- Browser evidence may support only fields it can directly establish through `verification-evidence.mjs`.
- A configured route/provider is not proof a feature worked in the current output.
- Do not label missing evidence as `false` or `unavailable`; use `Not verified`/unknown state.
- Stale render-bound evidence must stop supporting the current output after render inputs change.
- Preserve stricter existing checks if any live code is more conservative.
- Keep V1/main untouched; FREE ONLY; no paid provider enabling, large downloads, admin installs, deletion, force push, private uploads, or locked/imported media replacement.

## Suggested UI wording

- positive verified: `Verified available`
- negative verified: `Verified unavailable`
- unknown/stale/untrusted: `Not verified`

Do not expose implementation internals to the owner unless useful. Record exact test counts and any integration caveat in the handoff after local verification.
