# Work / Codex — Export Policy Classification

Read after `WORK_CODEX_HANDOFF.md` and the current chat-side delta files.

Chat-side additive module added:
- `v2/export-policy.mjs`
- `v2/export-policy.test.mjs`

Purpose: give the live Studio one consistent privacy classification for exported artifacts without treating privacy classification as legal/copyright clearance.

## Verify locally

Run:

```powershell
node --test v2/export-policy.test.mjs
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Do not weaken existing tests.

## Acceptance behavior

1. Known portable JSON outputs such as publishing package, owner handoff, provenance summary and release envelope are labeled `PORTABLE — REVIEW BEFORE SHARING` only when no private structural signals are detected.
2. Any local path, `sourcePath`, private prompt/history field or localhost/bridge URL downgrades the artifact to `REVIEW REQUIRED`.
3. ZIP/binary backups are always `PRIVATE RECOVERY ONLY`.
4. Unknown/custom export types default to `REVIEW REQUIRED`; never infer share safety from `.json` alone.
5. Classification must never claim copyright, licensing, confidentiality or platform-policy clearance.

## Safe UI integration after tests

If local regression stays green, add a small label beside export actions showing the appropriate classification before download. Do not block private backup export; instead make the privacy distinction unmistakable. Do not upload or transmit artifacts anywhere.

Keep V1/main untouched, preserve all assets, and do not enable paid providers or large downloads.
