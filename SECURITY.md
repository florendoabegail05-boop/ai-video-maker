# Security Policy

## Design goals

AI Video Maker is intentionally local-first. The MVP should work without an account, backend, analytics, or API key.

## Never put secrets in the frontend

Do not commit API keys, OAuth client secrets, private keys, provider tokens, or credentials to this repository. Browser JavaScript is public and cannot safely hold a secret.

When external AI providers are added, calls requiring secrets must go through a server-side boundary with environment-managed secrets, least-privilege credentials, rate limits, validation, and abuse controls.

## Local data

Projects and reusable profiles are stored in the browser's local storage. Users should export important work because clearing site data or changing browsers can remove local data.

Do not store passwords, payment information, government IDs, or other sensitive personal information in project fields.

## Reporting a vulnerability

Please report suspected security issues privately to the repository owner rather than opening a public issue containing exploit details. Include the affected file/feature, impact, reproduction steps, and a safe suggested fix when possible.

## Release rule

Security-sensitive changes should be reviewed on a feature branch before merging to `main`.
