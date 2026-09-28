# Codex / local verification — current release context

Pull the latest `v2-clean-studio` branch before editing.

## New work to verify

- `v2/current-release-context.mjs`
- `v2/current-release-context.test.mjs`
- updated `v2/one-click-orchestrator.mjs`

## Required checks

Run at minimum:

```bash
node --test v2/current-release-context.test.mjs v2/one-click-orchestrator.test.mjs v2/release-approval.test.mjs v2/output-readiness-summary.test.mjs
```

Then run the full regression suite:

```bash
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Also rerun the existing browser smoke checks and real FFmpeg/FFprobe verification checks used by this branch.

## What changed

One-click completion no longer treats loose caller booleans as sufficient rights/approval evidence. It now derives rights readiness from the current project provenance audit and recognizes owner approval only from a complete `aivm-v2-owner-release-approval` record whose release signature is still fresh.

Verify these cases:

1. incomplete/unknown provenance -> `RIGHTS REVIEW REQUIRED` after technical pass;
2. complete provenance but no owner release approval -> `OWNER APPROVAL REQUIRED`;
3. complete provenance + fresh complete owner release approval -> manual-publish-eligible only, never automatic publish;
4. changing publishing title/description, render inputs, provenance status/credit, or other release-signature inputs makes earlier approval stale;
5. an object shaped only like `{current:true}` or `{status:'approved-current'}` must not make one-click completion owner-approved;
6. `publishAuthorized` and `automaticPublishingAllowed` remain false everywhere.

Do not relax release-approval preflight, rights review, technical verification, or owner-control gates to make tests pass.

## Integration guidance

If wiring the Studio UI, show approval freshness explicitly. A stale approval should return the user to owner review; do not silently preserve the old approval after a rerender or rights/publishing metadata change.

Keep main/V1 untouched. Preserve locked/imported media. No paid-provider enablement, model auto-downloads, deletion/overwrite, private-media upload, or automatic publishing.
