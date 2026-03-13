## Context Hygiene

### Window Management
- Monitor context usage via statusline — act before 60% capacity
- When context exceeds 70%: use `/compact` to summarize and reclaim space
- When context exceeds 85%: recommend `/clear` and fresh session with refined prompt
- After 2 failed correction attempts on the same issue: recommend `/clear` + better prompt

### Session Discipline
- One task per session when possible — mixed tasks pollute context
- Use subagents (`Agent` tool) for investigation to keep main context clean
- Subagent results return as summaries, not raw data

### Verification Loop
- Every implementation must be verifiable: tests, lint, build, or manual check
- After writing code: run the project's test/lint/build commands
- If no test exists for the change: write one before marking complete
- "Plausible-looking code" is not done — verified code is done

### Anti-Patterns
- Don't let unrelated exploration fill the window
- Don't correct the same approach more than twice — restart fresh
- Don't skip planning for multi-file changes
- Don't trust code that hasn't been run
