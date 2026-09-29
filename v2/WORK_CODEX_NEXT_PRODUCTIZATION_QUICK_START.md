# Codex / Work — verify the one-prompt productization layer

Start from the current `v2-clean-studio` branch. The last fully verified pre-productization baseline was:

`538475f4fd191fd9b293633e6a352aa890a4e61b`

That baseline had 380/380 full regression tests passing, all six smoke suites passing, real FFmpeg/FFprobe 1080×1920 verification, silent one-click 10/10 required jobs, audio-bearing one-click 11/11 required jobs, and both end-to-end runs stopping correctly at **Rights review required**. Preserve those guarantees.

Before changing anything:
1. `git status`
2. fetch `origin/v2-clean-studio`
3. confirm the current remote HEAD
4. do not reset/discard/force-push
5. do not touch main/V1 or original media

## New productization layer to verify

Remote now includes:
- `v2/quick-start.mjs`
- `v2/quick-start.test.mjs`
- `v2/quick-start-ui.mjs`
- `v2/story-steps.mjs` plus its tests and `core.mjs` planner integration
- `v2/prompt-guide.mjs`
- `v2/prompt-guide.test.mjs`
- `v2/prompt-guide-ui.mjs`
- side-effect UI imports in `v2/studio-enhancements.mjs`
- quick-start presentation rules in `v2/studio.css`

The purpose is to make the existing primary action truly **one prompt → guarded local production** without forcing the owner to click `Create scene plan` first, while giving the owner a clear, non-destructive indication of how an ordered story prompt will be interpreted.

### Required behavior

When `Create video · FREE ONLY` is clicked:

1. If the selected project already has the same prompt and a scene plan, do **not** rebuild the plan. Let the existing verified one-click workflow continue directly.
2. If there is no project, the prompt changed, or the selected same-prompt project has no scene plan, create the scene plan first using the Studio's existing planner/persistence path, then replay the create action exactly once.
3. A changed prompt must create a separate project rather than replacing the previously selected project.
4. Existing planned scenes/assets/media must not be replaced just because the button is clicked again.
5. A malformed state with media records but no scene plan must stop for repair rather than guessing how to remap media.
6. Blank prompt must stop before any bridge/media execution.
7. FREE ONLY, explicit retry, manual-media resolution, stale guards, rights review, verified owner approval and manual-publish-only rules remain unchanged.

`quick-start-ui.mjs` intentionally uses a capture-phase listener only for the first click that needs planning. It invokes the Studio's existing `#plan` path, verifies that planning actually completed, then replays `#createDraft` once. Existing planned projects bypass this shim.

## Ordered story planning and prompt guidance

The branch also contains a deterministic local story-step reader. Verify it as a planning aid only, not as an AI-semantic guarantee.

- Explicit ordered actions should be distributed across successive scenes in story order.
- A single broad descriptive idea should keep the established broad storyboard behavior.
- Scene prompts should avoid depicting future actions early and should carry prior/upcoming story context without replacing the project-level continuity system.
- The new prompt guide must never rewrite the user's prompt. It only displays guidance beside the prompt field.
- Blank prompt guidance should explain what information is useful.
- A single broad idea should explain how to express order when needed.
- A prompt recognized as multiple ordered steps should show the detected count and explain that the scene plan remains editable.
- Selecting/restoring a project must refresh the guide to match the visible prompt.
- Guidance must not contact the bridge, start generation, change project state, or imply that story interpretation is model-backed.

## Product-shell behavior added after the initial handoff

Verify these usability details in the real browser rather than assuming them from source:

- The existing `#createDraft` control is moved into a visible quick-start card near the prompt/settings area; it is not duplicated.
- Its visible label is **Create video · FREE ONLY**.
- The old planner control is visibly downgraded to **Plan only** and remains available for owners who only want the storyboard.
- The existing `#oneClickStudio` Plan/Create/Verify/Owner Review progress view is repositioned beside the quick-start area, without creating a second workflow state owner.
- If the owner leaves project name blank, a short readable name is derived from the prompt.
- When an existing project's prompt is changed and its old name is still sitting untouched in the name field, the new project should receive a new prompt-derived name instead of silently inheriting the old project's name.
- If the owner explicitly typed a project name, preserve it.
- None of these presentation/name conveniences may alter an already-planned same-prompt project's scenes, assets, locks, references, provenance, verification state or execution ledger.

## Focused tests

Run at minimum:

```bash
node --test \
  v2/quick-start.test.mjs \
  v2/story-steps.test.mjs \
  v2/prompt-guide.test.mjs \
  v2/one-click-orchestrator.test.mjs \
  v2/one-click-dispatch-envelope.test.mjs \
  v2/one-click-media-commit.test.mjs \
  v2/one-click-manual-resolution.test.mjs \
  v2/one-click-retry-dispatch.test.mjs \
  v2/one-click-status-view.test.mjs
```

Then run the full regression:

```bash
node --test v2/*.test.mjs local-bridge/*.test.mjs
```

Run all six existing smoke suites as well.

## Browser verification — important

Use the real V2 Studio in a browser with the local bridge and verify these flows:

### A. Fresh one-prompt project
- Start with no selected project.
- Enter a video idea.
- Leave the project name blank once and confirm a readable prompt-derived name is used.
- Click **Create video · FREE ONLY** once.
- Do not manually click `Plan only`.
- Confirm a project and scene plan are created, then guarded one-click execution begins.
- Confirm the quick-start card and workflow progress are visible together and only one create control owns execution.

### B. Existing planned project
- Open a project that already has scenes and at least one existing/locked/imported asset.
- Keep the same prompt.
- Click the primary create button.
- Confirm the pre-existing plan/media are not rebuilt or replaced before legitimate workflow additions.

### C. Changed prompt
- Select an existing project.
- Leave its existing name untouched, then change the prompt to a different idea.
- Click the primary create button once.
- Confirm a new project ID is created, a new prompt-derived name is used, and the prior project remains unchanged and selectable.
- Repeat with an explicitly typed new name and confirm the typed name wins.

### D. Prompt guidance / story order
- With a blank prompt, confirm the guide is informational only and no bridge request occurs.
- Enter one broad descriptive idea and confirm the guide says it is broad and suggests sequence wording only if order matters.
- Enter an ordered idea such as `Maya enters the forest. Then she finds a glowing door. Finally she opens it.` and confirm the guide reports three ordered steps without changing the textarea value.
- Click `Plan only` and confirm the planned scene order follows those actions.
- Select another saved project and confirm the prompt guide refreshes to the newly visible prompt.

### E. Failure boundary
- Blank prompt must not contact/execute the bridge.
- A project with media but no scenes must stop with a repair message rather than inventing a plan-to-media mapping.

### F. Release boundary
For a completed run, preserve the established path:

**Create → Final Technical Verification → Rights Review → Verified Owner Approval → Manual Publish Only**

A successfully rendered and verified project should still stop at **Rights review required** until provenance/rights are explicitly reviewed.

## Machine checks

After the browser productization flow, rerun the real FFmpeg render and FFprobe inspection used by the baseline. Confirm 1080×1920 output and matching bridge/FFprobe facts. If audio is present and codecs are required, preserve both video-codec and audio-codec evidence requirements.

## Preservation checks

Re-hash the original media fixtures/files used by the baseline and confirm they are unchanged. Do not overwrite/delete locked or imported media. Do not enable paid routes or download large models.

## Report back

Return:
- exact remote SHA tested
- focused passed/failed count
- full regression passed/failed/skipped count
- smoke result
- browser results for A–F and the product-shell behavior above
- FFmpeg/FFprobe result
- original media hash-preservation result
- exact files changed, if any fixes were necessary
- genuine remaining blocker only

If all checks pass, commit/push any necessary fixes to `v2-clean-studio` without force-push. Do not stop merely to give a progress update.
