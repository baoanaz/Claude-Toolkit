---
name: instinct-import
description: Import instincts from a local file or URL into project or global scope.
command: true
---

# Instinct Import

Import instincts from local files or HTTP(S) URLs.

## Implementation

Run:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" import <file-or-url> [--dry-run] [--force] [--min-confidence 0.7] [--scope project|global]
```

If `CLAUDE_PLUGIN_ROOT` is unavailable, resolve the installed Claude-Toolkit root and run the same script from there.

## Usage

```text
/instinct-import team-instincts.yaml
/instinct-import https://github.com/org/repo/instincts.yaml
/instinct-import team-instincts.yaml --dry-run
/instinct-import team-instincts.yaml --scope global --force
```

## What To Do

1. Fetch the instinct source.
2. Parse and validate instinct frontmatter.
3. Compare IDs and confidence against existing instincts in the target scope.
4. Add or update inherited instincts after confirmation, unless `--force` is used.
