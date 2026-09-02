# AI Video Maker

A zero-cost, local-first video blueprint studio for turning one idea into a practical short-form production plan.

## What it does

- Hook and short-form script generation
- 5-second scene breakdowns for 30/45/60 second videos
- Image prompts and motion/video prompts
- Character/environment/style continuity guidance
- Story-first shot structure and production quality checks
- Reusable local projects and profiles
- Editable scene cards with reorder/delete controls
- Voiceover option
- Platform-aware publishing title, description and hashtags
- 10 idea variations
- TXT and JSON export
- Copy buttons and keyboard shortcut (`Ctrl/Cmd + Enter`)
- Responsive mobile-friendly interface
- Installable/offline-ready PWA foundation

## Zero-budget architecture

This MVP is intentionally a static frontend: HTML + CSS + vanilla JavaScript. There is no backend, database, paid API, API key, framework, or build step. The story and quality engines run in the user's browser.

This means it is useful immediately at $0, while leaving room to add optional AI generation later without putting provider secrets in browser code.

## Security principles

- No secrets or API keys in the frontend.
- No third-party scripts, fonts, analytics or trackers.
- Content Security Policy blocks network connections by default (`connect-src 'none'`).
- User text is escaped before being inserted into generated HTML.
- Local project data stays in browser storage unless the user explicitly exports it.
- CI performs JavaScript syntax, required-file, local-first and CSP smoke checks.

## Product boundary

The current MVP creates a **production-ready video blueprint and handoff package**, not the final rendered video. Reliable AI rendering generally requires compute or a third-party generation service. The free-first product should first make story planning, continuity and prompt quality excellent, then add optional providers behind a secure server-side boundary.

## Quality pipeline

**IDEA → STORY → CHARACTER LOCK → WORLD LOCK → STYLE LOCK → STORYBOARD → SHOT DIRECTOR → IMAGE PROMPT → IMAGE-TO-VIDEO PROMPT → CONTINUITY HANDOFF → QC → AUDIO/PUBLISHING PACKAGE**

The design intentionally separates visual establishment from motion direction and keeps a previous-shot handoff available for sequential generation workflows.

## Roadmap

1. Validate the blueprint workflow with real creators.
2. Add richer story diagnostics and genre-specific structures.
3. Add local reference-asset management and stronger scene-to-scene handoffs.
4. Add optional provider adapters behind a secure server-side boundary.
5. Add real media assembly/export only when it can be done reliably within the user's budget and device constraints.

## Run

Open `index.html` in a modern browser or deploy the repository as a static site. No installation is required.
