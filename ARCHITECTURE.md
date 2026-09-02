# AI Video Maker — Future-Proof Architecture

## Product principle

The app is a local-first creator studio. Story planning, continuity, prompts, quality checks, project state and exports work without a paid backend. Generation providers are optional adapters and must never be required by the core editor.

## Stable layers

1. **UI layer** — `index.html`, `style.css`, `quality.css`, `pipeline.css`
2. **Creator state** — `app.js`
3. **Story/quality intelligence** — `quality-engine.js`
4. **Production tracking** — `production-pipeline.js`
5. **Configuration** — `app-config.js`
6. **Provider boundary** — `provider-registry.js`
7. **Offline shell** — `register-sw.js`, `sw.js`

Do not put provider-specific API calls into the UI, story engine or production tracker.

## Provider contract

A future provider adapter should expose a small deterministic boundary:

- `id`, `name`, `version`
- supported kinds: `image`, `video`, `audio`, `voice`, `assembly`
- optional HTTPS endpoint
- whether credentials are required
- adapter version

The core app creates provider-neutral jobs. A future adapter may translate those jobs into a vendor-specific request. This makes providers replaceable without changing project data or the storyboard.

## Data compatibility

- New persisted structures must include a schema version.
- Readers should tolerate missing optional fields.
- Migrations must be deterministic and one-way.
- Never silently discard user project data.
- Exports must remain valid JSON and include their schema version.

## Security boundary

The frontend must not contain provider secrets. Runtime network access remains disabled until a deliberate architecture change is reviewed. If remote generation is eventually enabled, use a server-side credential boundary, HTTPS-only endpoints, explicit user consent, least-privilege credentials, and deployment environments for secrets. GitHub recommends least-privilege workflow permissions and protected environments for sensitive deployments.

## Change strategy

Prefer additive, backwards-compatible changes. Keep provider adapters isolated. Add a smoke test for every new contract. Run CI before merging to `main`. Never weaken a failing security test merely to make CI green.

## Future roadmap

- Provider adapter modules
- Pluggable image/video/audio generation
- Voice and caption adapters
- Render/assembly worker boundary
- Project import/export migration layer
- Golden-story regression fixtures
- Browser E2E tests
- Performance budgets
- Accessibility checks
- Optional staging/production deployment with protected environment gates
