# Work/Codex Next — One-Click Dispatch Envelope

Pull the latest `v2-clean-studio` branch before editing. Chat added an additive dispatch-boundary module only; do not force-push and preserve any newer remote work.

## New files

- `v2/one-click-dispatch-envelope.mjs`
- `v2/one-click-dispatch-envelope.test.mjs`

## Verify first

Run the targeted test:

```bash
node --test v2/one-click-dispatch-envelope.test.mjs
```

Then run the complete V2/bridge regression and the existing smoke suites used by the current handoff. Report exact pass/fail counts. Do not claim success from code inspection alone.

## Intended behavior

`prepareNextOneClickDispatch()` converts only the next scheduler-approved job into guarded internal dispatch metadata and marks that ledger entry `RUNNING`. It must remain FREE ONLY, non-destructive, local-first and non-publishing.

Before any real provider/FFmpeg/FFprobe call, the live executor must call `validateOneClickDispatch()` again against the current project state. Stale revisions/scenes/render inputs must reject the dispatch instead of applying an old result.

The dispatch payload intentionally carries reference asset IDs rather than local source paths. Resolve any required local files only inside the trusted local executor/bridge boundary. Do not serialize private local paths into portable metadata.

## Integration target

After tests pass, wire this conservatively between the one-click UI/orchestrator and existing live executor actions:

1. inspect one-click session;
2. prepare next dispatch envelope;
3. immediately revalidate envelope;
4. call only the already verified FREE ONLY live route for that job type;
5. capture guarded result through the existing result gate;
6. update ledger/status view;
7. continue to the next safe job.

Do not create a background retry loop. Do not auto-download models. Do not enable paid/future providers. Do not upload owner media externally. Do not overwrite locked/imported media. Do not auto-publish.

## Important review points

- Confirm director/captions jobs should remain internal/local and cannot accidentally enter provider code.
- Confirm image/motion dispatch resolves references only when the bridge advertises verified workflow mapping; unsupported reference forwarding must stay stripped.
- Confirm final assembly/verification revalidate current render signature immediately before execution.
- Confirm any audio generation remains blocked from automatic dispatch until a concrete verified local adapter/route is represented in the draft job itself.
- Preserve stricter existing checks if current live code is more conservative than this module.

## Safety

No V1/main changes. No force push. No paid provider activation. No large automatic downloads. No admin changes. No destructive cleanup. No private media upload. Publishing remains owner-controlled and `publishAuthorized:false`.
