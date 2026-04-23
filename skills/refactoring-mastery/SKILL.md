---
name: refactoring-mastery
description: Comprehensive design patterns, code smells, and refactoring techniques from RefactoringGuru. Use when writing new code, reviewing code, refactoring, making architecture decisions, or selecting design patterns for Tier 2/3 tasks.
---

# Refactoring Mastery

Complete decision framework for design patterns, code smell detection, and refactoring techniques. Based on RefactoringGuru's GoF Design Patterns and Refactoring catalogs.

## When to Use

- Designing new components, services, or bounded contexts
- Refactoring complex or tangled code
- Reviewing code for quality issues
- Choosing between patterns or abstractions
- Detecting and fixing code smells
- Architecture decisions on Tier 2/3 tasks

## Core Principles

1. **KISS** — Simplest solution that works. Complexity requires concrete justification.
2. **Single Responsibility** — Each unit has one reason to change.
3. **Composition Over Inheritance** — Combine objects, don't extend classes. Max 2 inheritance levels.
4. **Rule of Three** — No abstraction until 3 instances. Duplication > premature abstraction.
5. **Encapsulate What Varies** — Isolate the parts that change from the parts that stay the same.
6. **Program to Interfaces** — Depend on abstractions (ABC/Protocol), not concrete classes.

## Decision Framework

| Situation | Start Here | Reference |
|-----------|-----------|-----------|
| New service/component | Core Principles + Pattern Quick Ref | `docs/design-patterns.md` |
| Code review | Smell Quick Ref → identify issues | `docs/code-smells.md` |
| Refactoring existing code | Smell → Technique → Pattern | `docs/decision-flowchart.md` |
| Choosing a pattern | Complexity Signal table below | `docs/design-patterns.md` |
| Post-implementation cleanup | Refactoring Techniques by purpose | `docs/refactoring-techniques.md` |

## Design Pattern Quick Reference

### Creational Patterns

| Pattern | Complexity Signal | YAGNI Guard |
|---------|------------------|-------------|
| **Factory Method** | Multiple types share creation logic | Only if 3+ types exist |
| **Abstract Factory** | Families of related objects vary together | Only if 2+ families exist |
| **Builder** | Step-by-step construction with validation | Only if 4+ optional params |
| **Prototype** | Cloning complex objects is cheaper than constructing | Only if construction is measurably expensive |
| **Singleton** | Exactly one instance needed globally | Use module-level instance instead in Python |

### Structural Patterns

| Pattern | Complexity Signal | YAGNI Guard |
|---------|------------------|-------------|
| **Adapter** | Incompatible interface needs wrapping | Only at integration boundaries |
| **Bridge** | Two independent dimensions of variation | Only if both dimensions actually vary |
| **Composite** | Tree/recursive structures | Only if depth > 1 level |
| **Decorator** | Stackable behavior around objects | Only if 2+ decorations combine |
| **Facade** | Complex subsystem needs simple entry point | Only if 3+ classes involved |
| **Flyweight** | Many similar objects consume memory | Only if measured memory issue |
| **Proxy** | Control access, lazy load, or cache | Only if access control is a requirement |

### Behavioral Patterns

| Pattern | Complexity Signal | YAGNI Guard |
|---------|------------------|-------------|
| **Chain of Responsibility** | Ordered processing stages | Only if 3+ handlers |
| **Command** | Parameterize, queue, or undo operations | Only if undo/queue is needed |
| **Iterator** | Custom traversal over collection | Use Python generators instead |
| **Mediator** | Many-to-many object communication | Only if 4+ objects interact |
| **Memento** | Save/restore object state | Only if undo is a feature |
| **Observer** | Cross-context side effects | Only if 2+ listeners exist |
| **State** | Object behavior changes with status | Only if 3+ states with transition rules |
| **Strategy** | Algorithm varies by configuration | Only if 2+ algorithms exist now |
| **Template Method** | Multiple types share process skeleton | Only if 3+ variants share 60%+ logic |
| **Visitor** | Operations on heterogeneous collections | Rarely needed — prefer `singledispatch` |

## Code Smell Quick Reference

### Bloaters (things that grow too large)

| Smell | Detection Signal | Primary Fix |
|-------|-----------------|-------------|
| Long Method | > 30 lines | Extract Method |
| Large Class | > 500 lines or 5+ responsibilities | Extract Class |
| Primitive Obsession | Repeated primitive groups | Replace with Value Object |
| Long Parameter List | > 4 parameters | Introduce Parameter Object |
| Data Clumps | Same field group in 3+ places | Extract Class |

### OO Abusers (misuse of OO mechanisms)

| Smell | Detection Signal | Primary Fix |
|-------|-----------------|-------------|
| Switch on Type | `if/elif` chain on type or status | State or Strategy pattern |
| Refused Bequest | Subclass ignores parent methods | Replace Inheritance with Composition |
| Temporary Field | Fields only used in some scenarios | Extract Class |
| Alternative Classes | Different classes, same interface | Unify or extract interface |

### Change Preventers (changes cascade everywhere)

| Smell | Detection Signal | Primary Fix |
|-------|-----------------|-------------|
| Divergent Change | One class changes for multiple reasons | Extract Class per reason |
| Shotgun Surgery | One change touches 5+ files | Move Method / Inline Class |
| Parallel Hierarchies | Adding subclass requires adding another | Merge hierarchies |

### Dispensables (things that can be removed)

| Smell | Detection Signal | Primary Fix |
|-------|-----------------|-------------|
| Duplicate Code | Same logic in 3+ places | Extract Method / Superclass |
| Dead Code | Unreachable or unused code | Delete it |
| Lazy Class | Class does almost nothing | Inline Class |
| Speculative Generality | Built "for the future" | Remove unused abstraction |
| Comments | Comments explain what, not why | Rename + Extract Method |

### Couplers (excessive coupling between classes)

| Smell | Detection Signal | Primary Fix |
|-------|-----------------|-------------|
| Feature Envy | Method uses another class's data more than its own | Move Method |
| Inappropriate Intimacy | Classes access each other's internals | Move/Extract, Hide Delegate |
| Message Chains | `a.b().c().d()` | Hide Delegate |
| Middle Man | Class delegates everything | Inline Class |

## Python Implementation Patterns

These Pythonic idioms replace verbose GoF implementations:

| GoF Pattern | Python Idiom |
|-------------|-------------|
| Singleton | Module-level instance or `__new__` |
| Factory Method | Dict dispatch: `TYPES = {"a": ClassA, "b": ClassB}` |
| Strategy | First-class functions or `Callable` parameter |
| Iterator | Generators (`yield`) |
| Observer | Django signals or callback lists |
| State | Enum with methods or state classes with `__init_subclass__` |
| Template Method | ABC with `@abstractmethod` hooks |
| Visitor | `@functools.singledispatch` |
| Decorator (pattern) | `@functools.wraps` wrapper functions |
| Command | Dataclass + `execute()` method |
| Prototype | `copy.deepcopy()` |
| Builder | `@dataclass` with `__post_init__` validation |

## Navigation

For full details, examples, and decision trees:

- **[Design Patterns](docs/design-patterns.md)** — All 22 GoF patterns with Python skeletons and project examples
- **[Code Smells](docs/code-smells.md)** — 22 smells with detection heuristics and fixes
- **[Refactoring Techniques](docs/refactoring-techniques.md)** — Techniques by 6 purposes with before/after
- **[Decision Flowchart](docs/decision-flowchart.md)** — Smell-to-technique-to-pattern decision tree
