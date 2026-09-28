# Codex / Work Next — Explicit Retry Dispatch

Branch: `v2-clean-studio`

New files to verify:
- `v2/one-click-retry-dispatch.mjs`
- `v2/one-click-retry-dispatch.test.mjs`

Related modules that must remain compatible:
- `v2/job-failure-classifier.mjs`
- `v2/job-retry-policy.mjs`
- `v2/draft-execution-ledger.mjs`
- `v2/one-click-orchestrator.mjs`
- `v2/one-click-dispatch-envelope.mjs`
- `v2/one-click-result-processor.mjs`
- `v2/generation-input-guard.mjs`
- `v2/one-click-media-commit.mjs`

## Goal

Close the gap between `RETRY_ELIGIBLE` and a real safe second attempt. A failed job must never be silently restarted. An explicit retry request should create a fresh current-state dispatch envelope, fresh operation guard, and fresh generation-input guard before changing the ledger back to `RUNNING`.

## Required checks

1. Run the focused retry-dispatch test.
2. Run retry policy, failure classifier, dispatch-envelope, result-processor, generation-input-guard, media-commit, scheduler, ledger, and orchestrator tests.
3. Run the full V2/local-bridge regression suite.
4. Confirm a first failed image/motion attempt has `attempts=1`; an explicit retry changes it to `RUNNING` with `attempts=2`; the configured attempt cap then prevents another retry.
5. Confirm `explicitRetry:true` is required. Do not wire an automatic retry loop.
6. Confirm owner/payment/login/CAPTCHA/permission failures cannot reach retry dispatch.
7. Confirm project revision, plan fingerprint, route/capability drift, scene changes, bible/reference changes, or render-input changes require replan rather than retry.
8. For motion retry, verify `payload.sourceAssetId` exactly matches `generationGuard.parentAssetId` and the current source image. Do not silently choose a replacement image.
9. Revalidate `validateOneClickDispatch()` immediately before the real local action.
10. Preserve all locked/imported media. No deletion, overwrite, upload, provider switching, paid route, model download, or publish action is authorized by retry dispatch.

## Integration guidance

The UI/live runner may expose a `Retry` action only when the result processor reports `RETRY_ELIGIBLE`. Calling `prepareOneClickRetryDispatch(...,{explicitRetry:true})` prepares metadata only. The returned envelope must still be executed by the verified local adapter and processed through the normal guarded result/media-commit path.

Do not represent `automaticRetryAllowed:false` as a limitation bug; it is a deliberate safety boundary. A future owner setting for automatic retries would require a separate explicit approval design and must not be inferred from this module.

## Capability honesty

A successful retry proves only that the guarded local job completed. It does not prove photorealism, temporal quality, native audio, lip sync, 4K quality, rights clearance, final technical verification, or publishing approval.
