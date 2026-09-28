# Work/Codex next: output readiness summary

Pull/fetch the latest `v2-clean-studio` safely. Do not force-push.

Validate the new additive module:

- `node --test v2/output-readiness-summary.test.mjs`
- then full `node --test v2/*.test.mjs local-bridge/*.test.mjs`
- rerun the established smoke suites after integration changes.

Review `v2/output-readiness-summary.mjs` as a conservative bridge between final technical verification and release readiness.

Required behavior to preserve:

- technical verification, rights review, and owner approval remain separate concerns;
- a technical PASS must not imply rights clearance or publication readiness;
- rights complete must not imply owner approval;
- even when all checks are satisfied, status is `OWNER APPROVED — MANUAL PUBLISH ONLY`;
- `publishAuthorized:false` and `automaticPublishingAllowed:false` remain hard locks;
- stale render evidence must not support readiness;
- do not weaken stricter existing release/readiness logic if it already exists.

If safe, integrate the summary into the live readiness/status UI only after tests pass. Prefer reusing existing provenance/release approval records instead of inventing parallel owner state.

Do not touch V1/main. FREE ONLY. No paid providers, downloads, destructive cleanup, private uploads, automatic publishing, or force push.
