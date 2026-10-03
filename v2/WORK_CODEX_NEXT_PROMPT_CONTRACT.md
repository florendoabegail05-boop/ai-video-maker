# Work / Codex Next — Generation Prompt Contract

Branch: `v2-clean-studio`

This additive batch introduces a backend-neutral scene generation contract and threads it through the draft job plan and guarded one-click dispatch metadata.

## New contract

`v2/generation-prompt-contract.mjs` derives deterministic scene intent from existing saved project state:

- subject
- action
- setting
- shot
- camera
- lighting
- style
- continuity state
- negative prompt
- approved character/world reference asset IDs

Reference IDs are metadata only. This batch does **not** enable reference-image byte forwarding, does not guess ComfyUI node mappings, and does not change current capability claims.

## Verify locally

Fetch the latest `v2-clean-studio` without resetting or cleaning the workspace, then run:

```bash
node --test \
  v2/generation-prompt-contract.test.mjs \
  v2/generation-prompt-contract-integration.test.mjs \
  v2/draft-job-plan.test.mjs \
  v2/one-click-dispatch-envelope.test.mjs
```

Then run:

```bash
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

If no runtime/UI behavior is changed beyond this metadata batch, the previously closed browser/production verification remains the baseline; do not repeat expensive browser work unless a real regression or integration change requires it.

## Boundaries

- FREE ONLY remains mandatory.
- Do not enable paid providers.
- Do not download models automatically.
- Do not modify main/V1.
- Do not delete/replace locked or imported media.
- Do not enable character/world reference forwarding unless a real local workflow/model and exact node mapping are independently verified.
- Do not claim model-generated quality, native audio, lip-sync, upscale, or 4K merely because intent metadata exists.
- Publishing remains manual and owner-controlled.

Report exact focused/full test counts, any real failures, and whether the prompt contract remains metadata-only.
