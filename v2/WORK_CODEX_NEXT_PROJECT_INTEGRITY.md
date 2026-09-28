# Work / Codex — Project Integrity Audit Follow-up

Branch: `v2-clean-studio`

This chat-side milestone is additive and intentionally does not change the live Studio UI while Work/Codex may be editing it.

## Added

- `v2/project-integrity.mjs`
- `v2/project-integrity.test.mjs`

## Purpose

The new integrity audit checks internal project metadata before future backup/export/owner-handoff gating without mutating the project or media.

It detects:
- duplicate scene IDs;
- duplicate asset IDs;
- missing scene/asset links;
- one-way or cross-scene asset links;
- broken parent/derived asset lineage;
- invalid reference kind/role/missing-file state;
- malformed project-level audio role/scene linkage;
- non-FREE ONLY projects;
- overgrown revision history;
- stale final-output verification;
- locked stale assets as warnings only (never auto-replace).

## Local verification

After pulling latest remote state, run:

```powershell
node --test v2/project-integrity.test.mjs
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Do not weaken any existing assertions.

## Suggested live integration after current browser work is stable

1. Consider running `auditProjectIntegrity(project)` before complete ZIP export, owner handoff export, and final assembly metadata handoff.
2. Block only on `severity: error`; warnings should remain visible but non-destructive.
3. Never auto-fix IDs, relink assets, unlock assets, replace locked media, or delete files from this audit.
4. If a legacy project fails only because of recoverable metadata shape, add an explicit migration with tests rather than silently mutating during audit.
5. Browser-test duplicate-name projects and restored backups before making the audit a live gate.

## Acceptance

- Audit itself is read-only.
- Valid projects pass.
- Broken metadata relationships are named precisely.
- Locked stale assets remain owner-controlled warnings.
- No V1/main changes, paid providers, downloads, installs, or media uploads.
