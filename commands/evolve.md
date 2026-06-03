---
name: evolve
description: Analyze instincts and suggest or generate evolved skills, commands, and agents.
command: true
---

# Evolve

Analyze learned instincts and cluster related ones into higher-level structures.

## Implementation

Run:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" evolve [--generate]
```

If `CLAUDE_PLUGIN_ROOT` is unavailable, resolve the installed Claude-Toolkit root and run the same script from there.

## Usage

```text
/evolve
/evolve --generate
```

## What To Do

1. Detect the current project context.
2. Read project-scoped and global instincts.
3. Group instincts by trigger/domain patterns.
4. Identify skill, command, agent, and promotion candidates.
5. When `--generate` is present, write generated structures under the active learning data directory.
