# AI Video Maker — Device Safety Contract

This document defines a hard safety boundary for the application on Windows, macOS, Linux, Android, iOS/iPadOS, and browsers.

## Principles

1. Least privilege: never require administrator/root access unless a future feature genuinely cannot work without it.
2. User-owned data is never deleted, moved, renamed, or overwritten automatically.
3. Application data is isolated under an application-owned data directory.
4. Generated media is written to controlled project/output directories with collision-safe names.
5. Local services bind to loopback by default; no public LAN/WAN exposure by default.
6. No arbitrary shell commands may originate from prompts, project files, remote responses, or downloaded workflows.
7. Third-party workflows/models are treated as untrusted inputs and validated before use.
8. Never disable antivirus, firewall, OS security, sandboxing, or driver protections.
9. Never silently install drivers, system services, browser extensions, or unrelated software.
10. Heavy inference must pass hardware/storage checks and use bounded concurrency.
11. Native crashes and repeated failures must trigger a safe stop, not an infinite restart loop.
12. Uninstall must remove application-managed files only and must not touch user projects outside the app data root.

## Storage safety

- Use a dedicated application data root.
- Use atomic writes (temporary file + rename) for project state.
- Keep backups/versioned project state before migrations.
- Never use recursive deletion on user-selected directories.
- Cleanup is opt-in and reports exactly what will be removed.
- Model downloads are resumable and do not replace an existing verified model without explicit confirmation.

## Resource safety

Before heavy generation, estimate memory/storage requirements. If insufficient, stop with an actionable explanation and offer a smaller model, lower resolution, lower frame count, or external worker route. Do not force the operation.

The worker should expose health, memory, queue, and failure state to the UI. A native crash classification is non-retryable until the worker/runtime is restarted safely.

## Network safety

- Local bridge: loopback only by default.
- Remote access: disabled by default.
- Cloud providers: explicit opt-in and user-supplied credentials only.
- Frontend: never stores provider secrets.
- Downloads: HTTPS where supported, explicit user action, integrity verification where metadata is available.

## Android/iOS safety

Use platform sandboxing and user-mediated file/photo selection. Do not require root/jailbreak. Request the minimum permissions necessary. Heavy local inference is optional; remote/local-PC workers are preferred when the device cannot safely support the workload.

## Windows/macOS/Linux safety

Prefer per-user installation/data locations. Do not modify registry/system configuration, shell profiles, drivers, or PATH unless explicitly required and clearly disclosed. Prefer bundled or isolated runtimes where licensing permits.

## Security acceptance tests

A release is not device-safe until tests cover:

- insufficient RAM/VRAM
- insufficient disk space
- interrupted model download
- corrupt model file
- malformed workflow
- malicious path traversal attempt
- native engine crash
- repeated generation failure
- application restart during generation
- uninstall with user projects present
- local bridge attempted from a non-loopback origin
- permission denial on mobile

## Non-destructive release rule

All major device/runtime changes land on a feature branch first. Existing models, workflows, project data, and working features remain untouched unless the user explicitly authorizes a destructive migration.
