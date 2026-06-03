---
name: instinct-status
description: Show learned instincts for the current project and global scope with confidence.
command: true
---

# Instinct Status

Show learned instincts for the current project plus global instincts, grouped by domain.

## Implementation

Run:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" status
```

If `CLAUDE_PLUGIN_ROOT` is unavailable, resolve the installed Claude-Toolkit root and run the same script from there.

## Usage

```text
/instinct-status
```

## What To Do

1. Detect the current project context.
2. Read project-scoped instincts and global instincts.
3. Merge with project instincts taking precedence when IDs collide.
4. Display instincts grouped by domain with confidence bars and observation stats.
