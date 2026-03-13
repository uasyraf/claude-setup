---
name: typescript
description: TypeScript/JavaScript coding standards — strict types, Zod validation, Vitest testing, named exports.
type: language
globs: "**/*.ts,**/*.tsx,**/*.js,**/*.jsx"
---

## TypeScript Standards

### Types
- No `any` — use `unknown` and narrow, or define proper types
- Use `satisfies` for type-safe object literals with inference
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use discriminated unions over optional fields for variant types
- Export types alongside their implementations

### Validation
- Use Zod for runtime validation at system boundaries
- Derive TypeScript types from Zod schemas (`z.infer<typeof schema>`)
- Validate all external input: API requests, env vars, file reads

### Exports
- Named exports over default exports
- Barrel files (`index.ts`) only at package boundaries, not within modules
- Re-export types explicitly

### Testing
- Vitest for unit and integration tests
- Colocate tests: `foo.test.ts` next to `foo.ts`
- Use `describe`/`it` blocks with clear test names
- Mock at module boundaries, not internal functions

### Style
- `const` by default, `let` when reassignment is needed, never `var`
- Async/await over raw promises; avoid `.then()` chains
- Early returns over nested conditionals
- Destructure function parameters when 3+ properties
