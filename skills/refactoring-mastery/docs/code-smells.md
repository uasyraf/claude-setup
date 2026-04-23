# Code Smells — Full Catalog

22 code smells across 5 categories with detection heuristics and refactoring fixes.

## Bloaters

Things that have grown so large they're hard to work with.

### Long Method

- **Detection**: Method exceeds 30 lines or does more than one thing
- **Why it hurts**: Hard to understand, test, and reuse
- **Fix**: Extract Method — pull coherent blocks into named functions
- **Indicator**: Multiple comment blocks explaining sections, or you need to scroll to see the whole method

### Large Class

- **Detection**: Class exceeds 500 lines or has 5+ distinct responsibilities
- **Why it hurts**: Changes for unrelated reasons, hard to test in isolation
- **Fix**: Extract Class — one class per responsibility
- **Indicator**: Methods that never use each other, or field groups used by different method clusters

### Primitive Obsession

- **Detection**: Repeated use of `str`, `int`, `float` for domain concepts (money, email, phone)
- **Why it hurts**: Validation scattered everywhere, no type safety
- **Fix**: Replace Data Value with Object — create value objects or use `NewType`/`@dataclass`
- **Indicator**: Same validation logic repeated for the same primitive in 3+ places

### Long Parameter List

- **Detection**: Function takes more than 4 parameters
- **Why it hurts**: Hard to call correctly, easy to swap arguments
- **Fix**: Introduce Parameter Object — group related params into a `@dataclass`
- **Indicator**: Multiple callers pass the same group of arguments

### Data Clumps

- **Detection**: Same group of 3+ fields appears together in multiple classes or method signatures
- **Why it hurts**: Duplication, changes must be made in multiple places
- **Fix**: Extract Class — group the clump into its own `@dataclass`
- **Indicator**: `(street, city, postal_code)` repeated across Customer, Supplier, Branch

## OO Abusers

Misapplication of object-oriented principles.

### Switch Statements (on type)

- **Detection**: `if/elif` chain checking `type`, `status`, or `category` to select behavior
- **Why it hurts**: Adding a new type means modifying every switch — violates Open/Closed
- **Fix**: Replace Conditional with Polymorphism — use State or Strategy pattern
- **Indicator**: Same switch appears in 2+ methods

### Refused Bequest

- **Detection**: Subclass overrides parent methods to do nothing, or ignores most inherited interface
- **Why it hurts**: Violates Liskov Substitution, misleading hierarchy
- **Fix**: Replace Inheritance with Composition — delegate instead of inherit
- **Indicator**: `pass` in overridden methods, or `NotImplementedError` in subclass

### Temporary Field

- **Detection**: Instance fields that are only set and used in specific scenarios
- **Why it hurts**: Object state is unpredictable, None checks spread
- **Fix**: Extract Class — move the temporary fields and their methods into their own class
- **Indicator**: Fields initialized to `None` and only populated in one code path

### Alternative Classes with Different Interfaces

- **Detection**: Two classes do the same thing but have different method names
- **Why it hurts**: Can't substitute one for another, duplication of logic
- **Fix**: Rename methods to match, extract shared interface (Protocol/ABC)
- **Indicator**: Two classes with similar field sets but different method signatures

## Change Preventers

Code structured so that one change requires modifying many places.

### Divergent Change

- **Detection**: One class is modified for multiple unrelated reasons
- **Why it hurts**: Changes for reason A risk breaking reason B
- **Fix**: Extract Class — split into one class per axis of change
- **Indicator**: Git blame shows the class changes in unrelated PRs

### Shotgun Surgery

- **Detection**: One logical change requires editing 5+ files
- **Why it hurts**: Easy to miss a file, inconsistency risk
- **Fix**: Move Method / Inline Class — consolidate related logic into one place
- **Indicator**: A "simple" change touches models, services, serializers, views, tests, and admin

### Parallel Inheritance Hierarchies

- **Detection**: Creating a subclass in one hierarchy requires creating one in another
- **Why it hurts**: Coupled hierarchies, double the maintenance
- **Fix**: Merge hierarchies — use composition or move methods to collapse one hierarchy
- **Indicator**: Mirror class names like `OrderProcessor` / `OrderValidator` with matching subclasses

## Dispensables

Things that serve no purpose and can be removed.

### Duplicate Code

- **Detection**: Same logic (not just similar shape) appears in 3+ places
- **Why it hurts**: Bug fixed in one copy but not others
- **Fix**: Extract Method (same class), Extract Superclass (sibling classes), or Template Method
- **Indicator**: Copy-paste with minor variable name changes. Apply Rule of Three — don't extract on first duplication

### Dead Code

- **Detection**: Code that is never executed — unused functions, unreachable branches, commented-out blocks
- **Why it hurts**: Clutters understanding, may be accidentally revived
- **Fix**: Delete it. Git preserves history.
- **Indicator**: IDE grays it out, or `ruff` reports F841/F811 unused warnings

### Lazy Class

- **Detection**: Class with only 1-2 trivial methods that just delegates
- **Why it hurts**: Indirection without value, cognitive overhead
- **Fix**: Inline Class — move its logic to the caller
- **Indicator**: Class exists "for future expansion" that never came

### Speculative Generality

- **Detection**: Abstract classes, hooks, parameters, or flags built for hypothetical future use
- **Why it hurts**: Complexity with no current benefit, may never be needed
- **Fix**: Collapse Hierarchy, Inline Class, Remove Parameter — delete the speculation
- **Indicator**: "We might need this later" in comments. YAGNI — build it when you need it.

### Comments (as smell)

- **Detection**: Comments that explain *what* code does rather than *why*
- **Why it hurts**: Comments rot faster than code, mask unclear logic
- **Fix**: Extract Method (name explains the what), Rename Variable/Method for clarity
- **Indicator**: `# Calculate the total` above a 20-line block — extract it as `calculate_total()`

## Couplers

Excessive coupling between classes.

### Feature Envy

- **Detection**: Method accesses another class's data more than its own
- **Why it hurts**: Logic in the wrong place, changes require touching both classes
- **Fix**: Move Method — move it to the class whose data it uses
- **Indicator**: `other.field_a + other.field_b * other.field_c` in a method that doesn't use `self`

### Inappropriate Intimacy

- **Detection**: Two classes access each other's private/internal attributes
- **Why it hurts**: Tight coupling, changes in one break the other
- **Fix**: Move Method/Field, Extract Class, Hide Delegate
- **Indicator**: Direct access to `_private` attributes from outside the class

### Message Chains

- **Detection**: `a.get_b().get_c().get_d()` — client navigates an object graph
- **Why it hurts**: Client coupled to the entire chain structure
- **Fix**: Hide Delegate — add a method on `a` that returns what the client actually needs
- **Indicator**: 3+ chained attribute accesses or method calls

### Middle Man

- **Detection**: Class where most methods simply delegate to another object
- **Why it hurts**: Unnecessary indirection, no added value
- **Fix**: Remove Middle Man — let clients talk to the delegate directly
- **Indicator**: 80%+ of methods are one-line delegates. (Opposite problem of Message Chains — balance is key.)
