# WORK/CODEX NEXT — Draft Job Dependency Scheduler

Chat-side additive files:
- `v2/job-dependency-scheduler.mjs`
- `v2/job-dependency-scheduler.test.mjs`

## Verify locally
1. Fetch/pull latest `v2-clean-studio` safely; no force push.
2. Run:
   - `node --test v2/job-dependency-scheduler.test.mjs`
   - full V2/bridge tests
   - smoke suites
3. Do not weaken existing tests to make this pass.

## What the module does
- Declares execution dependencies for the draft job plan.
- Director precedes scene images.
- Scene image precedes that scene's motion.
- Audio/captions depend on the director.
- Final assembly waits for non-optional media/audio/caption jobs.
- Final verification waits for assembly.
- Stale/failed/blocked/manual dependencies prevent silent downstream execution.

## Safe integration target
If local tests pass, consider a small live executor helper that asks `nextSchedulableDraftJob(...)` before starting a job. Before any asynchronous provider call, capture an operation guard; before applying a result, pass through `job-result-gate.mjs`.

Do not let this scheduler directly invoke providers. Keep execution and metadata separate so stale results can be rejected non-destructively.

## Required protections
- FREE ONLY remains default.
- No paid route without explicit owner approval.
- No large model download or admin action without owner approval.
- Preserve locked/imported media and V1/main.
- No automatic file deletion.
- No automatic upload/publish.
- `automaticExecutionAllowed:false` and `publishAuthorized:false` remain truthful until a separately verified executor flow exists.

## Browser/local checks after integration
- Starting a draft cannot run scene motion before its image is ready.
- A failed image prevents downstream motion until owner/system retry resolves it.
- A manual audio step does not get silently marked done; owner may explicitly skip/import.
- Final assembly does not begin while required jobs are unresolved.
- Final verification never runs against an unassembled/stale render.
- Duplicate-named projects remain isolated by project ID.

Update handoff/status with exact test counts, fixes, and commit SHA.