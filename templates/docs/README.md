# Documentation

This project organizes documentation using the [Diátaxis](https://diataxis.fr/)
four-mode framework. Each mode answers a different user need — do not mix them.

```
docs/
├── tutorials/      Learning-oriented  — step-by-step lessons for beginners
├── how-to/         Task-oriented      — recipes for users with a goal in mind
├── reference/      Information-oriented — API, config, schema details
└── explanation/    Understanding-oriented — architecture, rationale, trade-offs
```

## When to write what

| Mode        | Answers           | Reader mindset                 | Example                                  |
|-------------|-------------------|--------------------------------|------------------------------------------|
| Tutorial    | "How do I learn?" | New to the project             | `tutorials/01-first-deployment.md`       |
| How-to      | "How do I …?"     | Knows the basics, has a task   | `how-to/rotate-api-keys.md`              |
| Reference   | "What is X?"      | Needs accurate, lookup-style   | `reference/config-schema.md`             |
| Explanation | "Why is it so?"   | Wants context and trade-offs   | `explanation/why-event-sourcing.md`      |

## Adjacent artifacts (not under `docs/`)

| File                       | Purpose                                                  |
|----------------------------|----------------------------------------------------------|
| `README.md` (root)         | Project pitch + quickstart. Link out to `docs/`.         |
| `CHANGELOG.md`             | Release notes. Template: `~/.claude/templates/changelog/`|
| `docs/adr/ADR-NNN-*.md`    | Architecture decisions. Template: `~/.claude/templates/adr/`|
| `PROGRESS.md`              | Session progress log. Template: `~/.claude/templates/progress/`|

## Style

- One idea per file; split when a page grows past ~500 lines.
- Code blocks use language fences (```ts, ```py, ```bash).
- Inline code for identifiers: `functionName`, `CONSTANT_NAME`, `path/to/file.ts`.
- Link to source rather than duplicating it when referencing API surface.
- Dates are ISO format (YYYY-MM-DD).
