---
name: projects
description: List and maintain known continuous-learning project entries.
command: true
---

# Projects

List project registry entries and per-project instinct/observation counts.

## Implementation

Run:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" projects [delete|merge|gc]
```

If `CLAUDE_PLUGIN_ROOT` is unavailable, resolve the installed Claude-Toolkit root and run the same script from there.

## Usage

```text
/projects
/projects delete <project-id> --dry-run
/projects merge <from-id> <into-id> --dry-run
/projects gc --dry-run
```

## What To Do

1. With no subcommand, list known projects, instinct counts, observation counts, and last-seen timestamps.
2. `delete` removes one project registry entry and its project-scoped learning data after confirmation.
3. `merge` moves instincts and observations from one project ID into another after confirmation.
4. `gc` deletes zero-value project entries after confirmation.
