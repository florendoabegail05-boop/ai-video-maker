# Safe Runtime Test Matrix

Before a device-safe release, the worker must pass these checks without deleting or modifying unrelated user data:

- [ ] Dedicated app data directory is used.
- [ ] Absolute paths are rejected where project-relative paths are required.
- [ ] `..` traversal outside the app root is rejected.
- [ ] Filesystem root cannot be selected as the project/media root.
- [ ] Insufficient disk space blocks generation before model startup.
- [ ] Low free system memory blocks heavy generation before model startup.
- [ ] Native access-violation/segmentation-fault errors do not enter an infinite retry loop.
- [ ] Existing model files are never overwritten by automatic setup.
- [ ] Existing project files are never recursively deleted by cleanup.
- [ ] Local bridge remains loopback-only by default.
- [ ] Malformed/untrusted workflows cannot execute arbitrary shell commands.
- [ ] Interrupted generation leaves prior completed artifacts intact.
- [ ] Restarting the app preserves persisted job state.
- [ ] Uninstall removes only application-managed files.

## Release gate

A failed safety check blocks the release. Safety is a prerequisite, not a best-effort feature.
