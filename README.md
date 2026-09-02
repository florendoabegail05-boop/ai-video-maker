# AI Video Maker

A zero-cost, local-first video blueprint studio for turning one idea into a practical short-form production plan.

## What it does

- Hook and short-form script generation
- 5-second scene breakdowns for 30/45/60 second videos
- Image prompts and motion/video prompts
- Character/environment continuity guidance
- Voiceover option
- Platform-aware publishing title, description and hashtags
- 10 idea variations
- TXT and JSON export
- Copy buttons and keyboard shortcut (`Ctrl/Cmd + Enter`)
- Responsive mobile-friendly interface

## Zero-budget architecture

This MVP is intentionally a static frontend: HTML + CSS + vanilla JavaScript. There is no backend, database, paid API, API key, framework, or build step. The story engine runs in the user's browser.

This means it is useful immediately at $0, while leaving room to add an optional backend AI provider later without putting provider secrets in browser code.

## Security principles

- No secrets or API keys in the frontend.
- No third-party scripts, fonts, analytics or trackers.
- Content Security Policy blocks network connections by default (`connect-src 'none'`).
- User text is escaped before being inserted into generated HTML.
- No `innerHTML` is used for user-controlled prompt values without escaping.
- No account or server is required for the local blueprint workflow.

## Important product boundary

The current MVP creates a **video blueprint**, not the final rendered video. That is deliberate: reliable AI video rendering generally requires compute or a third-party generation service. The free-first product should first make the planning and prompt workflow excellent, then add optional providers behind a secure server-side boundary.

## Roadmap

1. Validate the blueprint workflow with real creators.
2. Add reusable character/style/environment profiles for continuity.
3. Add editable scene cards and drag/reorder.
4. Add local project save/import using browser storage/file export.
5. Add optional server-side AI generation with strict rate limits, validation and secrets stored only as server environment variables.
6. Add provider abstraction so users can switch providers instead of being locked to one vendor.
7. Add automated tests and dependency/security checks before introducing a framework or backend.

## Run

Open `index.html` in a modern browser or deploy the repository as a static site. No installation is required.
