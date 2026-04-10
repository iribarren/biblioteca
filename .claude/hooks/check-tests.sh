#!/bin/bash
# Hook: Stop
# If the last assistant turn edited source files (.php, .js, .css, .twig)
# without running tests or delegating to test-writer, prints a reminder.
# Outputs nothing when the condition is not met.

python3 - << 'EOF'
import json, sys

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

# Support both 'transcript' and 'messages' keys
transcript = data.get('transcript') or data.get('messages') or []

# Find the last assistant message
last_assistant = None
for msg in reversed(transcript):
    if isinstance(msg, dict) and msg.get('role') == 'assistant':
        last_assistant = msg
        break

if not last_assistant:
    sys.exit(0)

content = last_assistant.get('content', [])
if isinstance(content, str):
    sys.exit(0)

SOURCE_EXTS = ('.php', '.js', '.css', '.twig')
TEST_KEYWORDS = ('phpunit', 'pest', 'npm test', 'npm run test', 'vitest', 'pytest')

had_code_edit = False
had_tests = False

for block in content:
    if not isinstance(block, dict) or block.get('type') != 'tool_use':
        continue

    tool = block.get('name', '')
    inp = block.get('input') or {}

    if tool in ('Edit', 'Write'):
        path = inp.get('file_path', '')
        if any(path.endswith(ext) for ext in SOURCE_EXTS):
            had_code_edit = True

    if tool == 'Bash':
        cmd = inp.get('command', '')
        if any(kw in cmd for kw in TEST_KEYWORDS):
            had_tests = True

    if tool == 'Agent':
        subagent = inp.get('subagent_type', '')
        prompt = inp.get('prompt', '')
        if 'test-writer' in subagent or 'test-writer' in prompt:
            had_tests = True

if had_code_edit and not had_tests:
    print('Consider running tests or delegating to the test-writer agent to verify these changes.')

EOF
