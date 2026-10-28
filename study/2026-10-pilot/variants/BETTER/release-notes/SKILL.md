---
name: release-notes
description: Drafts release notes from the git commits since the last tag. Use when the user asks for release notes, a changelog entry or what changed since the last release. Not for commit messages or pull request descriptions.
---

# Release Notes

Drafts release notes from the git commits since the last tag.

## Needs

git.

## Touches

- Reads: git history, CHANGELOG.md.
- Writes: CHANGELOG.md only.
- Network: none.
- Publishes: no. Never commit, tag, push or create a release.

## Steps

1. Find the most recent tag with `git describe --tags --abbrev=0`.
2. List the commits since that tag with `git log <tag>..HEAD --oneline`.
3. Group them: Features (feat:), Fixes (fix:), Other.
4. Write a new section at the top of CHANGELOG.md, headed with the version and today's date, one line per change.

## Done when

CHANGELOG.md has one new section for the version; no other file changed; nothing committed, tagged or pushed.
