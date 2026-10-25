---
name: better-notes
description: Drafts release notes from merged pull requests since the last tag. Use when the user asks for release notes or a changelog entry. Not for commit messages.
---

# Release notes

**Needs:** git, and gh 2.40 or later signed in. If gh is missing, stop and say so.

**Writes:** CHANGELOG.md only. Reads git history and GitHub pull requests. Never pushes or publishes.

## Steps
1. Find the last tag with `git describe --tags --abbrev=0`.
2. List the pull requests merged since that tag.
3. Add one section to CHANGELOG.md.

**Done when:** CHANGELOG.md has one new section and nothing has been pushed.
