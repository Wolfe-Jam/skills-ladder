---
name: best-notes
description: Drafts release notes from merged pull requests since the last tag. Use when the user asks for release notes or a changelog entry. Not for commit messages.
---

<!-- faf:start -->
```yaml
v: 1
needs: [git, gh >= 2.40]
reads: [git history, GitHub pull requests]
writes: [CHANGELOG.md]
network: [github.com (read)]
publishes: false
done_when: CHANGELOG.md has one new section; nothing pushed
```
<!-- faf:end -->

# Release notes

## Steps
1. Find the last tag with `git describe --tags --abbrev=0`.
2. List the pull requests merged since that tag.
3. Add one section to CHANGELOG.md.
