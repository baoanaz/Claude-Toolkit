---
name: prune
description: Delete expired pending instincts from the continuous-learning store.
command: true
---

# Prune

Delete pending instincts older than the configured TTL.

## Implementation

Run:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" prune [--max-age <days>] [--dry-run] [--quiet]
```

If `CLAUDE_PLUGIN_ROOT` is unavailable, resolve the installed Claude-Toolkit root and run the same script from there.

## Usage

```text
/prune
/prune --dry-run
/prune --max-age 14
```

## What To Do

1. Scan global and project pending instinct directories.
2. Delete pending instincts older than the selected age unless `--dry-run` is present.
3. Report pruned and remaining counts.
