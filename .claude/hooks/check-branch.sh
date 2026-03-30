#!/bin/bash
# Hook: PreToolUse (Edit|Write)
# Blocks source code edits on master branch.
# Config/docs files are allowed on master.

INPUT=$(cat)

# Extract file_path from JSON input
FILE_PATH=$(echo "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

# If no file_path found, allow (might be a non-file operation)
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Normalize backslashes to forward slashes (Windows paths)
FILE_PATH=$(echo "$FILE_PATH" | tr '\' '/')

# Get current branch
BRANCH=$(git branch --show-current 2>/dev/null)

# If not on master, allow everything
if [ "$BRANCH" != "master" ]; then
  exit 0
fi

# On master: allow config/docs files, block everything else
case "$FILE_PATH" in
  *CLAUDE.md|*PLAN.md|*README.md)
    exit 0
    ;;
  */.claude/*|*/compose.yaml|*/compose.prod.yaml|*/docker/*|*/docs/*|*/.env|*/.gitkeep|*/.gitignore)
    exit 0
    ;;
  *)
    echo "BLOCKED: You are on master. Create a feature/ or bugfix/ branch first before editing source code." >&2
    echo "  File: $FILE_PATH" >&2
    echo "  Run: git checkout -b feature/<name> or git checkout -b bugfix/<name>" >&2
    exit 2
    ;;
esac
