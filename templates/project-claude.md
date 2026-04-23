# <Project Name>

<!--
This file is business/domain context ONLY.
Technical standards, tier routing, agent rules, and language conventions
inherit from ~/.claude/ (global). Do NOT duplicate them here.

Target length: 50-150 lines. Anything beyond is probably global concern.
-->

## Domain

<2-4 sentences describing what this product does and why it exists.>

## Primary users

- <persona 1 — role, motivation, pain point>
- <persona 2 — ...>

## Key business entities

- **<EntityA>** — <1-line role in the domain>
- **<EntityB>** — <1-line role in the domain>
- **<EntityC>** — <1-line role in the domain>

## Business rules / invariants

- <Rule 1>. Rationale: <why this exists>
- <Rule 2>. Rationale: <why this exists>
- <Rule 3>. Rationale: <why this exists>

## External systems

| System | Purpose | Endpoint / location | Auth |
|--------|---------|---------------------|------|
| <ServiceX> | <what we use it for> | <base URL or config key> | <mechanism> |
| <ServiceY> | ... | ... | ... |

## Project-specific overrides

<!-- Only list rules that diverge from global ~/.claude/ rules. If empty, delete this section. -->

- None

## Non-goals

- <What this project explicitly does NOT do — prevents scope creep>
- <...>

## Glossary

- **<term>** — <domain-specific meaning>
- **<term>** — <...>

---

<!--
What belongs here:
  ✓ domain model, business rules, invariants
  ✓ external system contracts (auth, endpoints)
  ✓ project-specific divergence from global rules (with reason)
  ✓ non-goals and glossary

What does NOT belong here (inherits from ~/.claude/):
  ✗ tier/complexity routing
  ✗ agent team definitions
  ✗ language style rules (TypeScript, Python, etc.)
  ✗ security checklists, output formatting
  ✗ memory or hook configuration
-->
