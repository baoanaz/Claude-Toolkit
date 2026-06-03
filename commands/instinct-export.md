---
name: instinct-export
description: Export instincts from project, global, or merged scope to a file.
command: true
---

# Instinct Export

Export instincts to a shareable YAML-style format.

## Implementation

Run:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" export [--domain <name>] [--min-confidence <n>] [--output <file>] [--scope project|global|all]
```

If `CLAUDE_PLUGIN_ROOT` is unavailable, resolve the installed Claude-Toolkit root and run the same script from there.

## Usage

```text
/instinct-export
/instinct-export --domain testing
/instinct-export --min-confidence 0.7
/instinct-export --output team-instincts.yaml
/instinct-export --scope project --output project-instincts.yaml
```

## What To Do

1. Detect the current project context.
2. Load instincts from the requested scope.
3. Apply domain and confidence filters.
4. Write to the requested output file, or print to stdout when no output path is provided.
