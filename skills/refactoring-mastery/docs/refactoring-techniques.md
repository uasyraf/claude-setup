# Refactoring Techniques

Key techniques organized by 6 RefactoringGuru categories. Each includes when to apply and before/after examples.

## Composing Methods

Techniques for breaking down complex methods into readable pieces.

### Extract Method

**When**: A code fragment can be grouped and named.
**Steps**: 1) Identify coherent block. 2) Create new method with descriptive name. 3) Replace block with call.

```python
# Before
def process_order(self, order):
    # validate
    if not order.lines:
        raise ValidationError("No lines")
    if order.total <= 0:
        raise ValidationError("Invalid total")
    # save
    order.status = "confirmed"
    order.confirmed_at = now()
    order.save()
    # notify
    send_email(order.customer.email, f"Order {order.number} confirmed")

# After
def process_order(self, order):
    self._validate_order(order)
    self._confirm_order(order)
    self._notify_customer(order)
```

### Inline Method

**When**: A method body is as clear as its name. Remove unnecessary indirection.
**Steps**: 1) Verify method isn't overridden. 2) Replace all calls with body. 3) Delete method.

### Replace Temp with Query

**When**: A temporary variable holds a computation result used once.
**Steps**: 1) Extract computation to method. 2) Replace temp usage with method call.

```python
# Before
base_price = self._quantity * self._item_price
if base_price > 1000:
    return base_price * 0.95

# After
if self.base_price > 1000:
    return self.base_price * 0.95

@property
def base_price(self) -> Decimal:
    return self._quantity * self._item_price
```

### Substitute Algorithm

**When**: An algorithm can be replaced with a clearer or more efficient one.
**Steps**: 1) Ensure tests cover current behavior. 2) Replace the algorithm body. 3) Run tests.

## Moving Features Between Objects

Techniques for placing functionality in the right class.

### Move Method

**When**: A method uses data from another class more than its own (Feature Envy).
**Steps**: 1) Check all features used. 2) Move to target class. 3) Update references.

```python
# Before: method in OrderService uses inventory data
def check_availability(self, order):
    for line in order.lines:
        stock = self._inventory_repo.get_stock(line.item_id)
        if stock.available < line.quantity:
            raise InsufficientStock(line.item_id)

# After: method moved to InventoryService
class InventoryService:
    def check_availability(self, lines: list[OrderLine]) -> None:
        for line in lines:
            stock = self._repo.get_stock(line.item_id)
            if stock.available < line.quantity:
                raise InsufficientStock(line.item_id)
```

### Move Field

**When**: A field is used more by another class than its own.
**Steps**: 1) Create field in target. 2) Update all usages. 3) Remove from source.

### Extract Class

**When**: A class does two things (Divergent Change, Large Class).
**Steps**: 1) Identify the second responsibility. 2) Create new class. 3) Move related fields and methods.

### Inline Class

**When**: A class does too little (Lazy Class, Middle Man).
**Steps**: 1) Move all features to the consumer class. 2) Delete the empty class.

### Hide Delegate

**When**: Client navigates object chain (Message Chains): `dept.manager.email`.
**Steps**: 1) Add method on the intermediary. 2) Client calls intermediary instead.

```python
# Before
manager_email = employee.department.manager.email

# After (method on Employee)
manager_email = employee.manager_email

@property
def manager_email(self) -> str:
    return self.department.manager.email
```

## Organizing Data

Techniques for making data handling cleaner.

### Replace Data Value with Object

**When**: A primitive carries domain meaning (Primitive Obsession).
**Steps**: 1) Create value class. 2) Replace primitive usage. 3) Add behavior to value class.

```python
# Before
customer_phone: str = "+60123456789"

# After
@dataclass(frozen=True)
class PhoneNumber:
    value: str

    def __post_init__(self):
        if not re.match(r"^\+\d{10,15}$", self.value):
            raise ValueError(f"Invalid phone: {self.value}")

    @property
    def country_code(self) -> str:
        return self.value[:3]
```

### Replace Type Code with Subclasses

**When**: Type code affects behavior (Switch on Type smell).
**Steps**: 1) Create subclass per type. 2) Move type-specific logic to subclass. 3) Remove conditionals.

### Replace Type Code with State/Strategy

**When**: Type code changes at runtime or subclassing isn't possible.
**Steps**: 1) Create state/strategy classes. 2) Delegate behavior. 3) Remove conditionals.

### Introduce Parameter Object

**When**: Same group of parameters travels together (Data Clumps, Long Parameter List).
**Steps**: 1) Create `@dataclass` for the group. 2) Replace parameter list. 3) Move behavior if appropriate.

```python
# Before
def search_orders(self, start_date, end_date, entity_id, status, page, page_size): ...

# After
@dataclass
class OrderSearchCriteria:
    start_date: date
    end_date: date
    entity_id: UUID
    status: OrderStatus | None = None
    page: int = 1
    page_size: int = 25

def search_orders(self, criteria: OrderSearchCriteria): ...
```

## Simplifying Conditional Expressions

Techniques for making branching logic readable.

### Decompose Conditional

**When**: Complex conditional with non-obvious condition or branches.
**Steps**: 1) Extract condition to method. 2) Extract then/else branches to methods.

```python
# Before
if date.today() < self._summer_start or date.today() > self._summer_end:
    charge = quantity * self._winter_rate + self._winter_service_charge
else:
    charge = quantity * self._summer_rate

# After
if self.is_winter():
    charge = self.winter_charge(quantity)
else:
    charge = self.summer_charge(quantity)
```

### Consolidate Conditional Expression

**When**: Several conditions yield the same result.
**Steps**: 1) Combine conditions with `or`/`and`. 2) Extract to named method.

### Replace Conditional with Polymorphism

**When**: Same switch appears in multiple methods (Switch on Type).
**Steps**: 1) Create class per type. 2) Move branch logic to corresponding class. 3) Use State/Strategy.

### Introduce Guard Clauses

**When**: Nested if/else makes the happy path hard to find.
**Steps**: 1) Identify edge cases. 2) Return early for each. 3) Leave happy path as the main body.

```python
# Before
def calculate_pay(self, employee):
    if employee.is_active:
        if employee.is_separated:
            result = separated_amount()
        else:
            if employee.is_retired:
                result = retired_amount()
            else:
                result = normal_amount()
    return result

# After
def calculate_pay(self, employee):
    if not employee.is_active:
        return Decimal(0)
    if employee.is_separated:
        return separated_amount()
    if employee.is_retired:
        return retired_amount()
    return normal_amount()
```

## Simplifying Method Calls

Techniques for cleaner interfaces.

### Rename Method

**When**: Name doesn't reveal intent. Most impactful refactoring.
**Steps**: 1) Choose name that describes what, not how. 2) Update all callers.

### Add / Remove Parameter

**When**: Method needs more/less info than its signature provides.
**Steps**: 1) Add with default value for backward compatibility. 2) Migrate callers. 3) Remove default.

### Separate Query from Modifier

**When**: Method both returns value and changes state (CQS violation).
**Steps**: 1) Create pure query method. 2) Create void modifier method. 3) Split callers.

```python
# Before
def get_and_reset_counter(self) -> int:
    value = self._counter
    self._counter = 0
    return value

# After
def get_counter(self) -> int:
    return self._counter

def reset_counter(self) -> None:
    self._counter = 0
```

### Replace Constructor with Factory Method

**When**: Construction logic is complex or needs to return different types.
**Steps**: 1) Create factory method. 2) Move construction logic. 3) Make constructor private.

## Dealing with Generalization

Techniques for managing class hierarchies.

### Pull Up Method / Field

**When**: Duplicate method/field in sibling subclasses.
**Steps**: 1) Ensure signatures match. 2) Move to parent. 3) Remove from subclasses.

### Push Down Method / Field

**When**: Method/field only relevant to one subclass.
**Steps**: 1) Move to the subclass that uses it. 2) Remove from parent.

### Extract Superclass

**When**: Two classes share significant common code (after Rule of Three).
**Steps**: 1) Create parent class. 2) Pull up shared methods/fields. 3) Both classes inherit.

### Extract Interface

**When**: Multiple classes share a subset of methods that clients depend on.
**Steps**: 1) Define Protocol/ABC with shared methods. 2) Declare conformance. 3) Type parameters to interface.

```python
# Extract shared interface
class Confirmable(Protocol):
    def confirm(self, confirmed_by: UUID) -> None: ...
    def cancel(self, reason: str) -> None: ...

# Both SalesOrderService and PurchaseOrderService conform
def process_confirmation(doc: Confirmable, user_id: UUID) -> None:
    doc.confirm(confirmed_by=user_id)
```

### Collapse Hierarchy

**When**: Subclass is essentially the same as parent (Speculative Generality).
**Steps**: 1) Move all features to one class. 2) Delete the other. 3) Update references.

### Replace Inheritance with Delegation

**When**: Subclass uses only part of parent's interface (Refused Bequest).
**Steps**: 1) Create field of parent type. 2) Delegate needed methods. 3) Remove inheritance.
