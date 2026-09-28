# Work / Codex Next — One-Click Result Processor

Fetch `v2-clean-studio` first and do not force-push. Preserve remote work and V1/main.

## Verify

Run at minimum:

```bash
node --test v2/one-click-result-processor.test.mjs
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Also rerun the existing browser/smoke and real FFmpeg/FFprobe checks if live Studio or bridge integration is changed.

## What this module is for

`one-click-result-processor.mjs` closes the loop between a prepared guarded dispatch and the one-click session ledger:

1. revalidate the current FREE ONLY dispatch guard,
2. reject stale/project-mismatched results without mutating progress,
3. record successful guarded jobs as DONE,
4. record executor failures as FAILED,
5. expose retry eligibility through the existing conservative retry policy,
6. return the next orchestration action/job without publishing.

## Integration rules

- Never apply a stale result.
- Never switch to paid providers or consume paid credits automatically.
- Never auto-retry login/CAPTCHA/payment/permission/owner-action failures.
- Never delete a rejected output file merely because the result is stale.
- Preserve locked/imported media.
- Do not treat ledger completion as permission to publish.
- `publishAuthorized` and automatic publishing must remain false.
- Do not place raw media bytes, private paths, tokens, or provider secrets into the session/result metadata.

## Important media-application boundary

The current result gate accepts only `assetIds` that already exist in the project. That is deliberate: a provider result must not silently invent or replace project media.

For generated image/video/audio outputs, integrate a separate non-destructive media registration/application step before reporting the new asset ID as an accepted job result. That step should:

- create a project asset record explicitly,
- bind it to the intended scene only after current-state checks,
- preserve locked/imported assets,
- keep old generated media available until replacement is confirmed,
- avoid deleting stale/rejected files automatically,
- use fresh operation guards.

Do not weaken `job-result-gate.mjs` just to accept unknown asset IDs.

## Suggested live wiring

When the local executor returns:

- success -> pass only safe metadata (`ok`, `message`, already-registered `assetIds`) into `processOneClickDispatchResult(...)`;
- failure -> pass a concise failure reason, then show RETRY ELIGIBLE / OWNER INPUT REQUIRED / REPLAN / REVIEW FAILURE according to the returned action;
- stale result -> keep the file for recovery/inspection but do not apply it to the current project.

After integration, update the V2 handoff/status with exact test counts, smoke results, and the final commit SHA. Do not claim tests passed unless they actually ran locally.
