# AI Video Maker — Platform Compatibility

## Supported product surfaces

| Platform | Experience | Heavy AI inference |
|---|---|---|
| Windows | Desktop app + browser/PWA | Local worker when hardware passes checks |
| macOS | Desktop app + browser/PWA | Local worker when hardware passes checks |
| Linux | Browser/PWA + compatible desktop packaging | Local worker when hardware passes checks |
| Android | PWA/app shell | Prefer paired local-PC or remote worker for heavy models |
| iPhone/iPad | PWA/app shell | Prefer paired local-PC or remote worker for heavy models |
| Browser | Responsive creator studio | Uses an available worker; browser-only inference is optional |

## Compatibility strategy

The UI and project format are platform-neutral. Heavy inference is separated into worker adapters so the same project can be controlled from a phone and generated on a PC without duplicating project logic.

Projects use versioned JSON metadata plus media assets. The format must be forward-compatible and migration-safe.

## Mobile-first requirements

- Touch-friendly controls.
- Responsive layouts.
- Resumable uploads/downloads.
- Job progress survives reconnects.
- No root/jailbreak requirement.
- Minimum permissions.
- Deep links for project/job review where supported.

## Desktop requirements

- Per-user install preferred.
- Local worker lifecycle management.
- Hardware capability probe.
- Model inventory.
- Safe worker startup/shutdown.
- Controlled media directories.

## Portability rule

No core feature may assume a Windows path, shell, GPU vendor, browser API, or ComfyUI-specific workflow. Platform-specific code belongs behind adapters.
