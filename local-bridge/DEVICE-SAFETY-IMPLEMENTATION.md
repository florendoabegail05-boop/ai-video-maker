# Device Safety Implementation

The local bridge is intentionally conservative:

- binds to `127.0.0.1` by default;
- limits JSON request bodies;
- accepts configured runner URLs only when they resolve to loopback;
- runs heavy generation through a serialized queue by default;
- does not automatically retry native/runtime failures;
- exposes diagnostics/capabilities before generation;
- keeps production AI distinct from preview fallbacks.

The safety helpers in `safety.mjs` provide path containment, safe output naming, loopback validation, storage checks, and crash classification for the next integration step.

## Integration order

1. Wire `safety.mjs` into all filesystem writes and media assembly paths.
2. Replace permissive CORS with an explicit local-app origin allowlist for browser clients.
3. Add startup resource checks before launching heavy workers.
4. Add worker lifecycle isolation and a bounded shutdown path.
5. Add automated safety tests for traversal, disk exhaustion, crash classification, and network exposure.
6. Package the worker per platform without requiring elevated privileges by default.

No existing models, workflows, projects, or user files are removed by these changes.
