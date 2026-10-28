---
name: release-notes
description: Drafts release notes from the git commits since the last tag.
---

# Release Notes

Drafts release notes from the git commits since the last tag.

## Steps

1. Find the most recent tag with `git describe --tags --abbrev=0`.
2. List the commits since that tag with `git log <tag>..HEAD --oneline`.
3. Group them: Features (feat:), Fixes (fix:), Other.
4. Write a new section at the top of CHANGELOG.md, headed with the version and today's date, one line per change.
