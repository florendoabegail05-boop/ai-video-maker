# Work / Codex Next — Complete Backup Audit

Read after `v2/WORK_CODEX_HANDOFF.md` and the latest chat-side queue files.

## New additive files

- `v2/backup-audit.mjs`
- `v2/backup-audit.test.mjs`

This module is intentionally **not wired into `bundle.mjs` or the live UI yet** so it should not conflict with ongoing local/browser integration.

## What it does

Adds a read-only preflight for the existing complete ZIP backup flow:

- reuses `auditProjectIntegrity(...)` before complete backup;
- checks project metadata size against the existing 1 MB bundle limit;
- checks known total bytes against the existing 100 MB bundle limit;
- checks file-count and supported extensions against the current bundle contract;
- warns when an asset is marked `hasFile` but lacks a connected local `sourcePath`;
- explicitly warns that complete ZIP backups are **private recovery artifacts** and may contain the full project prompt, bounded history and media bytes;
- emits an optional portable preflight receipt that excludes source paths and private prompt content.

It does **not** modify, reconnect, delete, upload or repair media.

## Verify locally

Run:

```powershell
node --test v2/backup-audit.test.mjs v2/project-integrity.test.mjs v2/bundle.test.mjs
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Do not weaken existing `bundle.mjs` limits to make tests pass.

## Integration recommendation after tests pass

1. Before **Export complete ZIP**, run `backupPreflight(project)`.
2. Block only on `error` issues.
3. Show privacy/portability warnings before download.
4. Do not silently strip prompt/history from the existing owner recovery ZIP; that would change recovery semantics. If a share-safe export is wanted later, create a separate export type.
5. Confirm restored ZIP behavior still disconnects portable source paths and requires safe local reconnect rather than trusting old machine paths.

## Safety rules

- Preserve V1/main.
- No paid providers.
- No uploads.
- No destructive repair.
- No large downloads/installs.
- Complete ZIP remains an owner-controlled recovery file, not a public publishing artifact.
