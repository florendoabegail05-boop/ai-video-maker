# Work / Codex — stale final verification + owner handoff checks

Read `v2/WORK_CODEX_HANDOFF.md` and `v2/WORK_CODEX_DELTA.md` first.

The following changes were committed from chat and are **not locally verified yet**.

## New chat-side implementation

- `render-signature.mjs`
  - Builds a deterministic, non-security render-input signature from timeline order/duration, selected final clip metadata, burned-in scene captions, and selected project music/voice assets.
  - Publishing title/description changes do not alter the signature.
  - `verificationFreshness(...)` marks legacy manifests without a signature as stale rather than trusting them.

- `final-output.mjs`
  - Final-output manifests now record the render signature present at verification time.

- `publishing.mjs`
  - `setFinalVerification(...)` refuses a passed manifest if its render signature no longer matches the project.
  - Publishing JSON reports `finalVideoVerified: true` only when the saved verification is still fresh for current render inputs.
  - A stale/missing verification is explicitly warned about.

- `final-output-ui.mjs`
  - Shows **STALE** when timeline/clip/caption/project-audio inputs change after final MP4 verification.
  - Requires the current final MP4 to be re-assembled/downloaded and verified again.

- `publishing-readiness.mjs`
  - Stale verification is a deterministic blocker for owner review.
  - Owner checklist carries the current render signature.

- `owner-handoff.mjs`
  - Creates a portable owner handoff package with readiness state, blockers, selected clip IDs, audio asset IDs, current render signature, verification freshness, and owner actions.
  - Excludes prompts, local paths, bridge URLs, media bytes and project history.

- `publishing-readiness-ui.mjs` / `index.html`
  - Adds **Export owner handoff**.
  - Refreshes readiness when scene/render-input state changes.

## Tests added/updated

Run at minimum:

```powershell
node --test v2/render-signature.test.mjs v2/final-output.test.mjs v2/publishing.test.mjs v2/publishing-readiness.test.mjs v2/owner-handoff.test.mjs
```

Then run the full V2 and local-bridge regression suite from the main handoff.

## Required browser checks

1. Assemble/download a valid current final MP4 and save a passed final verification.
2. Change only publishing title/description. Verification must remain fresh.
3. Change a burned-in scene caption. Verification must immediately show **STALE** and readiness must become NOT READY.
4. Restore caption, then switch the selected eligible clip or add/replace selected project music/voice. Verification must become stale.
5. Re-assemble/download and verify the new final MP4. Readiness may return to OWNER REVIEW REQUIRED only after all deterministic blockers pass.
6. Export publishing JSON before and after staleness. `finalVideoVerified` must be true only while the render signature matches.
7. Export owner handoff and confirm it contains no `sourcePath`, local Windows paths, loopback URLs, prompt text, media bytes or project history.
8. Cross-check the signature behavior against the actual assembler inputs. If the assembler includes another render-affecting input not currently represented, add it to `renderInputDescriptor(...)` before calling this feature verified.

## Important limitation

The render signature is a change detector, not a cryptographic security mechanism and not a media hash. Work/Codex should not present it as proof that a file's bytes are identical. Real MP4 facts still need the existing bridge/`ffprobe` verification path.

Preserve V1/main, use FREE ONLY, and do not download large models, enable paid providers, upload private media remotely, force-push, or make destructive changes without owner approval.
