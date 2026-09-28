# Codex / Work — additive media rebase + manual CI follow-up

Pull/fetch the latest `v2-clean-studio` and reconcile non-destructively with the current local integration. Do not reset, discard the named stash, force-push, or touch `main`/V1.

## New remote regression coverage

`v2/one-click-media-commit.test.mjs` now includes explicit checks that workflow-owned additive generated media does **not** create false execution-plan drift:

1. image registration rebases revision and advances to the motion job without `REPLAN`;
2. image → motion registration remains on the current plan and advances to captions without `REPLAN`.

Run at minimum:

```bash
node --test v2/one-click-media-commit.test.mjs v2/draft-plan-fingerprint.test.mjs v2/one-click-orchestrator.test.mjs
```

Then rerun the full V2/local-bridge regression after reconciling your local Studio integration.

If either new additive-rebase test fails, do not weaken plan-drift protection globally. Fix only the benign workflow-owned rebase path while keeping provider/capability/options/story/reference drift as `REPLAN`.

## Manual GitHub verification workflow

A new workflow exists at:

`.github/workflows/v2-manual-verification.yml`

It is **manual only** (`workflow_dispatch`) so it does not automatically consume Actions minutes on every push. It runs:
- the focused V2 execution/release suites;
- full `v2/*.test.mjs` + `local-bridge/*.test.mjs` Node regression;
- static checks that V2 source does not grant automatic publish or paid-provider permission.

Use it only if GitHub Actions availability/quota is acceptable. Local owner-machine browser + real FFmpeg/FFprobe verification remains authoritative for the actual Studio environment and cannot be replaced by CI.

## Preserve current safety rules

- FREE ONLY default;
- no hidden paid fallback;
- no automatic retry;
- no auto publish;
- generated media is additive only;
- locked/imported media preserved;
- motion stays bound to the exact guarded source image;
- stale generation/render/release evidence cannot be accepted;
- owner approval remains explicit and verified.

When finished, report exact focused/full counts, any reconciliation changes, local browser/FFmpeg/FFprobe status, and the final pushed remote SHA.
