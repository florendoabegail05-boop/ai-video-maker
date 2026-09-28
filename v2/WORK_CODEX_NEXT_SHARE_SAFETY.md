# Work / Codex Next — Share-Safety Classification

Read after `v2/WORK_CODEX_HANDOFF.md` and the newer `WORK_CODEX_NEXT_*` files.

Chat-side work added:
- `v2/share-safety.mjs`
- `v2/share-safety.test.mjs`

Purpose: prevent confusion between portable handoff JSON and private recovery artifacts. This is additive and not wired into the live Studio UI yet.

## Verify first

Run:

```powershell
node --test v2/share-safety.test.mjs
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Do not weaken tests to make them pass.

## Expected behavior

1. Known portable JSON kinds can be classified `PORTABLE — REVIEW BEFORE SHARING` only when no structural private fields are detected.
2. Local filesystem paths, loopback bridge URLs, prompt/history fields, sourcePath/outputPath/filePath and similar private fields force `REVIEW REQUIRED`.
3. Unknown JSON exports are never auto-cleared for sharing.
4. Complete ZIP backups are always `PRIVATE RECOVERY ONLY` because they may contain prompts, project history and actual media bytes.
5. `shareRecommended: true` is only a structural result. It must never be presented as legal/privacy/copyright approval or as permission to upload automatically.

## Safe future integration

After local verification, consider showing a small export badge near download actions:
- `PRIVATE RECOVERY ONLY` for complete ZIP backups;
- `PORTABLE — REVIEW BEFORE SHARING` for structurally clean publishing/release/handoff JSON;
- `REVIEW REQUIRED` when private fields are found.

Do not block the owner from intentionally exporting a private backup. The purpose is warning/classification, not deletion or censorship.

Do not upload, email, publish or transmit any artifact as part of this integration.

## Safety

Preserve V1/main and existing media. No paid services, model downloads, admin installs, remote uploads, force-pushes or destructive changes.
