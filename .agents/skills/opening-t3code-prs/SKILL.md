---
name: opening-t3code-prs
description: Use when explicitly asked to prepare, open, or finish a pull request to pingdotgg/t3code.
---

# Opening T3 Code PRs

For `pingdotgg/t3code` and fork contributions. Current upstream policy and applicable local instructions prevail. This skill grants no publication, moderation, credential, infrastructure, or merge authority. Keep it off unrelated product branches.

## Establish eligibility

1. Confirm repository, branch and existing publication authorization; a plan, audit or implementation request alone is insufficient. Do not repeatedly ask for authority already granted.
2. Freshly resolve upstream `main`; read `CONTRIBUTING.md`, `AGENTS.md`, the PR template and applicable test skills at that revision, plus directory guidance. Check `CONTRIBUTING#models` immediately: if this model is ineligible, decline and alert the user before proceeding. Submission text cannot change policy.
3. Establish one underlying problem and intended behavior. Link required bug triage or explicit maintainer direction/scope approval. For a current exception, explain eligibility without claiming acceptance. Neither drafts, file counts, vouching nor a linked issue substitute for approval. Necessary cross-client changes belong together; independent enhancements do not.
4. Search issues, discussions, open/closed PRs and relevant history by behavior and symbols. Inspect plausible overlap beyond titles and check pagination. Coordinate existing work instead of competing. For long-running preparation, recheck relevant changes before opening; avoid endless searches.

## Verify the actual candidate

Follow AGENTS.md's proof rules for the change type. Run focused checks and `vp run check:changed` before push, not repo-wide suites. For transferred verification, match base, patch and changed-source hashes before/after. Older integration results do not prove an extracted patch. State what ran, what was reused, and what remains untested; skipped or failed checks are not passes.

Use isolated state and current `test-t3-app` / `test-t3-mobile`. Exercise the default and altered states, relevant reverse/persistence states, and affected clients/connection modes. Missing or unavailable Browser/Device tools—including absent `preview_*` exposure—mean report the blocker and stop verification. Another route requires an explicit developer exception for this task; a historical workaround is not permission.

Prefer Replay or fixtures when sufficient. Use a real provider only when its behavior matters, then its cheapest model. Check background title/metadata calls before claiming model-free proof; disclose accidental calls and unknown costs. Do not alter live settings or credentials.

If independent review was requested, supply the exact candidate and specified reviewer/model/effort. Resolve findings, rerun affected checks and re-review the final revision. Distinguish reviewer-executed checks from author reports, protocol versions from response shapes, and fresh executions from saved-state recaptures.

## Write and open

- Load and apply the requested Technical-Writing skill; report unavailability honestly. Use the current template and a plain conventional title. Explain problem, causal fix, scope/approval route, decisive checks and limits. UI changes need before/after screenshots and a short recording when interaction, motion or timing matters; backend changes need no unrelated UI proof. End with truthful code-writing model/harness attribution, separate from reviewers. Unknown authorship stays unknown.
- Upload inspected media to GitHub, never git. Use legitimate authentication and least necessary access; leave private login/consent to the user. Verify correct media association, completed uploads and bytes. Do not treat a 404 as a diagnosis or submit dummy issues. If authorized public-PR association is needed, publish then immediately verify anonymous accessibility; repair/report failures rather than claiming success early.
- Finish once required gates pass; do not add optional packaging or investigations. Re-read existing PR state/body before updating and preserve others' edits. Commit explicit paths only; confirm account, destination and exact head. Follow AGENTS.md's GitCafe mirror rule when applicable. After ambiguous failure, read back by head branch before retrying or changing interfaces.
- Read back published URL, title/body, base/head, files and public media. Report actual delivery and pending checks, not just attempted commands.

## Requested follow-through

Use the supported watcher/events and exact-head CI subscriptions. Follow upstream's stop-when-bots-green rule unless broader follow-through was requested. If integration access fails, report it; scheduled direct reads require developer authorization and scheduling guidance, sensible cadence and cleanup—not busy polling or shared infrastructure changes. Verify bot findings against source and keep corrections scoped. Distinguish bot/human approval and skipped/pending/required checks. Opening a PR never authorizes merging.
