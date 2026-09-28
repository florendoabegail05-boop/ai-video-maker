# Work / Codex Next — Verification Evidence

Branch: `v2-clean-studio`

Chat added a pure additive tri-state technical evidence layer after the successful reconciliation commit `b550fbc`.

## New files

- `v2/verification-evidence.mjs`
- `v2/verification-evidence.test.mjs`

## Why

Browser-side checks can establish dimensions/duration/file size, but they should not silently turn unknown audio-stream/FPS/codec facts into `false` or `true`. FFprobe/bridge evidence is stronger for technical stream facts.

## Required local verification

1. Pull/fetch latest `v2-clean-studio`.
2. Run:
   - `node --test v2/verification-evidence.test.mjs`
   - full `node --test v2/*.test.mjs local-bridge/*.test.mjs`
   - existing six smoke suites.
3. Preserve all existing stricter checks.

## Suggested integration after tests pass

- Inspect `final-output.mjs`, `publishing.mjs`, and browser verification code before editing.
- Keep tri-state facts: `true / false / null`.
- Use browser evidence only for facts the browser can directly establish.
- Prefer current FFprobe evidence for audio stream, FPS, codec/container facts when available.
- Bind evidence to the current render signature where appropriate; stale render-bound evidence must become unknown, not reused.
- Never label 4K, audio stream, native audio, codec, FPS, lip-sync, or production-quality motion as verified without explicit trusted evidence.
- If existing behavior is stricter, keep the stricter behavior.

## Non-destructive / cost rules

- FREE ONLY remains the default.
- No paid calls, model downloads, admin installs, destructive cleanup, V1/main edits, force push, or private-media upload.
- Do not delete generated media just because evidence is stale.

## Acceptance

The UI/publishing layer can distinguish **verified true**, **verified false**, and **unknown**, with source and freshness, and never converts browser uncertainty into a false technical claim.
