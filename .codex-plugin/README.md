# .codex-plugin - Codex Native Plugin for Claude-Toolkit

This directory contains the Codex plugin manifest for Claude-Toolkit.

## Structure

```text
.codex-plugin/
`-- plugin.json   # Codex plugin manifest
.agents/plugins/
`-- marketplace.json
plugins/claude-toolkit/
|-- .codex-plugin/plugin.json
`-- skills -> ../../skills
skills/           # Shared skill source of truth
```

## What This Provides

- 4 Codex skills from `./skills/`:
  - `continuous-learning-v2`
  - `learned`
  - `learned-jira-bug-workflow`
  - `strategic-compact`
- Repo-scoped marketplace metadata at `.agents/plugins/marketplace.json`

## Installation

Codex plugin support is marketplace-backed. Add this repository as a marketplace,
then install or enable `claude-toolkit` from the Codex plugin directory.

```bash
# Add the public repo marketplace
codex plugin marketplace add baoanaz/Claude-Toolkit

# Or add a local checkout while developing
codex plugin marketplace add /absolute/path/to/Claude-Toolkit
```

The marketplace entry points at `plugins/claude-toolkit/`. That directory keeps a
Codex plugin manifest plus a `skills` symlink to the repository root `skills/`
directory, so Claude Code and Codex share one skill source of truth.

## Notes

- The `skills/` directory at the repository root is the shared skill source of truth.
- Claude Code `commands/`, `hooks/`, `agents/`, and `rules/` remain in the repository
  for Claude-specific installation paths; the Codex manifest intentionally does not
  declare unsupported `commands` or `hooks` fields.
- This manifest does not override `~/.codex/config.toml` settings.
