# Work/Codex Next — Owner Release Approval

Additive chat-side module added while Work may be editing live V2 files:

- `v2/release-approval.mjs`
- `v2/release-approval.test.mjs`

Purpose: create an explicit owner-review record that is tied to the exact render + publishing metadata + provenance state. It must never imply automatic publishing permission.

## Local verification

Run:

```powershell
node --test v2/release-approval.test.mjs
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Do not weaken existing readiness, stale-verification, provenance, or integrity rules to make these tests pass.

## Expected behavior

1. Release approval preflight is blocked unless deterministic publishing readiness passes and all asset provenance/rights records are owner-confirmed.
2. Creating an approval requires three explicit owner confirmations:
   - visual/audio review approved;
   - rights/credits approved;
   - platform settings reviewed.
3. Approval always exports `publishAuthorized: false`; it is a review record only.
4. Approval becomes stale if any release-affecting input changes, including:
   - selected render inputs / captions / audio through render signature;
   - publishing title or description;
   - asset rights status or credit metadata.
5. No source paths, bridge URLs, media bytes, private prompts, or automatic upload/publish action should be added.

## Suggested integration after tests pass

Expose a small **Owner Release Approval** panel only after the existing Publishing Readiness and provenance UI are locally verified. It should show `READY FOR OWNER APPROVAL`, `APPROVED FOR THIS RELEASE STATE`, or `APPROVAL STALE` — never `AUTO-PUBLISH READY`.

Do not wire any platform uploader, scheduler, paid provider, remote media upload, or owner-bypass behavior.
