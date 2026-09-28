# WORK / CODEX NEXT — Final Media Facts

Pull latest `v2-clean-studio` safely first. Do not force-push.

## New files
- `v2/final-media-facts.mjs`
- `v2/final-media-facts.test.mjs`

## Verify
1. Run `node --test v2/final-media-facts.test.mjs`.
2. Run the full V2 + bridge regression suite.
3. Run the existing smoke suites.
4. Inspect whether current FFprobe/bridge result shapes map cleanly into:
   - width / height / duration
   - fps
   - audioStream
   - videoCodec / audioCodec
   - container
5. Keep browser-only stream/FPS/codec facts UNKNOWN.
6. Confirm stale render-bound fact sets are ignored after render inputs change.
7. Confirm no local source paths leak into the portable reconciliation object.

## Integration direction
If tests pass, wire this conservatively into the final-output/publishing verification path. Prefer FFprobe over bridge, and machine evidence over browser evidence for internal media facts. Surface contradictions rather than silently choosing a misleading value.

Important separations:
- audio stream present != native generated audio
- 1080x1920 or 2160x3840 dimensions != artistic quality
- configured route != successful current render
- unknown != false

Preserve stricter existing behavior. FREE ONLY. No paid provider activation, model downloads, private uploads, destructive deletion, V1/main edits, or force-push. Keep `publishAuthorized:false` until explicit owner approval in the existing release flow.
