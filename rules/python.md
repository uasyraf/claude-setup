---
name: python
description: Python coding standards — PEP 8, ruff formatting, type annotations, pytest, pydantic.
type: language
globs: "**/*.py"
---

## Python Standards

### Style
- PEP 8 compliance, enforced by ruff
- Type annotations on all public function signatures
- Use `from __future__ import annotations` for forward references
- f-strings over `.format()` or `%` formatting
- Pathlib over os.path for file operations

### Validation
- Pydantic models for data validation at boundaries
- dataclasses for internal value objects without validation needs
- Type narrowing with `isinstance()` checks, not `type()`

### Testing
- pytest as test runner
- Fixtures over setUp/tearDown
- `conftest.py` for shared fixtures scoped to their directory
- Parametrize over copy-paste test cases
- Mock at boundaries (I/O, network, time), not internal logic

### Imports
- Standard library → third-party → local (isort groups)
- Absolute imports over relative imports
- Avoid wildcard imports (`from x import *`)

### Error Handling
- Specific exceptions over bare `except:`
- Custom exception hierarchies for domain errors
- Context managers (`with`) for resource management
- Never silently swallow exceptions
