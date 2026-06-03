---
name: promote
description: Promote project-scoped instincts to global scope.
command: true
---

# Promote

Promote instincts from project scope to global scope.

## Implementation

Run:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" promote [instinct-id] [--force] [--dry-run]
```

If `CLAUDE_PLUGIN_ROOT` is unavailable, resolve the installed Claude-Toolkit root and run the same script from there.

## Usage

```text
/promote
/promote --dry-run
/promote --force
/promote grep-before-edit
```

## What To Do

1. Detect the current project.
2. If an instinct ID is provided, promote that current-project instinct.
3. Otherwise, find cross-project candidates that appear in at least two projects and meet confidence thresholds.
4. Write promoted instincts to the global personal instincts directory.
