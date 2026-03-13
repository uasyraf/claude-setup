---
name: python-design-patterns
description: Python design patterns including KISS, Separation of Concerns, Single Responsibility, and composition over inheritance. Use when making architecture decisions, refactoring code structure, or evaluating when abstractions are appropriate.
---

# Python Design Patterns

Write maintainable Python code using fundamental design principles.

## When to Use

- Designing new components or services
- Refactoring complex or tangled code
- Deciding whether to create an abstraction
- Choosing between inheritance and composition
- Evaluating code complexity and coupling

## Core Principles

### 1. KISS (Keep It Simple)
Choose the simplest solution that works. Complexity must be justified by concrete requirements.

### 2. Single Responsibility (SRP)
Each unit should have one reason to change. Separate concerns into focused components.

### 3. Composition Over Inheritance
Build behavior by combining objects, not extending classes.

### 4. Rule of Three
Wait until you have three instances before abstracting. Duplication is often better than premature abstraction.

## Key Patterns

### Simple Dictionary Over Factory

```python
# Over-engineered
class FormatterFactory:
    _formatters: dict[str, type] = {}
    @classmethod
    def register(cls, name): ...
    @classmethod
    def create(cls, name): ...

# Simple
FORMATTERS = {"json": JsonFormatter, "csv": CsvFormatter}
def get_formatter(name: str) -> Formatter:
    return FORMATTERS[name]()
```

### Separated Concerns (Layered Architecture)

```python
# Repository: Data access
class UserRepository:
    async def get_by_id(self, user_id: str) -> User | None: ...

# Service: Business logic
class UserService:
    def __init__(self, repo: UserRepository) -> None:
        self._repo = repo
    async def get_user(self, user_id: str) -> User: ...

# Handler: HTTP concerns
@app.get("/users/{user_id}")
async def get_user(user_id: str) -> UserResponse: ...
```

### Dependency Injection

```python
class UserService:
    def __init__(self, repository: UserRepository, cache: Cache, logger: Logger) -> None:
        self._repo = repository
        self._cache = cache
        self._logger = logger

# Production
service = UserService(PostgresRepo(db), RedisCache(redis), StructlogLogger())
# Testing
service = UserService(InMemoryRepo(), FakeCache(), NullLogger())
```

## Anti-Patterns to Avoid

- Exposing ORM models to API layer (use response schemas)
- Mixing I/O with business logic (use repository pattern)
- Premature abstraction (wait for Rule of Three)
- Deep inheritance hierarchies (prefer composition)

## Best Practices Summary

1. Keep it simple — simplest solution that works
2. Single responsibility — one reason to change
3. Separate concerns — distinct layers, clear purposes
4. Compose, don't inherit — combine objects for flexibility
5. Rule of three — wait before abstracting
6. Keep functions small — 20-50 lines, one purpose
7. Inject dependencies — constructor injection for testability
8. Explicit over clever — readable beats elegant
