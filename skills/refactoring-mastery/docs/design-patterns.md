# Design Patterns — Full Catalog

All 22 GoF patterns with Python implementations and Myttem OS project examples.

## Creational Patterns

### Factory Method

**Intent**: Define an interface for creating objects, let subclasses decide which class.

```python
from abc import ABC, abstractmethod

class Document(ABC):
    @abstractmethod
    def render(self) -> str: ...

class InvoiceDocument(Document):
    def render(self) -> str:
        return "Invoice PDF"

# Python idiom: dict dispatch
DOCUMENT_TYPES: dict[str, type[Document]] = {
    "invoice": InvoiceDocument,
    "credit_note": CreditNoteDocument,
}

def create_document(doc_type: str) -> Document:
    return DOCUMENT_TYPES[doc_type]()
```

**Project example**: Document creation by type (SalesInvoice, PurchaseInvoice, CreditNote).
**Collaborates with**: Template Method, Strategy.

### Abstract Factory

**Intent**: Create families of related objects without specifying concrete classes.

```python
class TierFactory(ABC):
    @abstractmethod
    def create_number_generator(self) -> NumberGenerator: ...
    @abstractmethod
    def create_approval_workflow(self) -> ApprovalWorkflow: ...

class BasicTierFactory(TierFactory):
    def create_number_generator(self) -> NumberGenerator:
        return SequentialGenerator()
    def create_approval_workflow(self) -> ApprovalWorkflow:
        return SingleApprovalWorkflow()
```

**Project example**: Package tier factories (Basic/Pro/Premium) producing tier-specific services.
**Collaborates with**: Factory Method, Singleton.

### Builder

**Intent**: Construct complex objects step-by-step with validation.

```python
@dataclass
class SalesOrderBuilder:
    _customer_id: UUID | None = None
    _lines: list[OrderLine] = field(default_factory=list)
    _entity_id: UUID | None = None

    def customer(self, customer_id: UUID) -> Self:
        self._customer_id = customer_id
        return self

    def add_line(self, item_id: UUID, qty: Decimal) -> Self:
        self._lines.append(OrderLine(item_id=item_id, quantity=qty))
        return self

    def build(self) -> SalesOrder:
        if not self._customer_id or not self._lines:
            raise ValidationError("Customer and at least one line required")
        return SalesOrder(customer_id=self._customer_id, lines=self._lines, entity_id=self._entity_id)
```

**Project example**: Complex document creation (SO with header + lines + taxes).
**Collaborates with**: Composite, Factory Method.

### Prototype

**Intent**: Clone objects instead of constructing from scratch.

```python
import copy

class BOMTemplate:
    def clone(self) -> "BOMTemplate":
        return copy.deepcopy(self)
```

**Project example**: Cloning BOM templates for new production orders.
**Collaborates with**: Factory Method.

### Singleton

**Intent**: Ensure exactly one instance exists.

```python
# Python idiom: module-level instance (preferred)
# tenant_context.py
_context = threading.local()

def get_tenant_context() -> TenantContext:
    return _context.tenant
```

**Project example**: Tenant thread-local context, flag resolver cache.
**Collaborates with**: Facade, Factory Method.

## Structural Patterns

### Adapter

**Intent**: Convert one interface to another that clients expect.

```python
class KeycloakUserAdapter:
    """Adapts Keycloak user representation to our domain User."""
    def __init__(self, kc_user: dict) -> None:
        self._kc = kc_user

    @property
    def email(self) -> str:
        return self._kc["email"]

    @property
    def tenant_id(self) -> UUID:
        return UUID(self._kc["attributes"]["tenant_id"][0])
```

**Project example**: Keycloak API responses adapted to domain models.
**Collaborates with**: Facade, Decorator.

### Bridge

**Intent**: Separate abstraction from implementation so both can vary independently.

```python
class NotificationSender(ABC):
    @abstractmethod
    def send(self, message: str, recipient: str) -> None: ...

class EmailSender(NotificationSender): ...
class SMSSender(NotificationSender): ...

class OrderNotification:
    def __init__(self, sender: NotificationSender) -> None:
        self._sender = sender

    def notify_confirmed(self, order: SalesOrder) -> None:
        self._sender.send(f"Order {order.number} confirmed", order.customer.email)
```

**Project example**: Notification system where channel (email/SMS/webhook) varies independently from event type.
**Collaborates with**: Adapter, Strategy.

### Composite

**Intent**: Treat individual objects and compositions uniformly via tree structure.

```python
class BOMNode(ABC):
    @abstractmethod
    def explode(self, qty: Decimal) -> list["MaterialRequirement"]: ...

class RawMaterial(BOMNode):
    def explode(self, qty: Decimal) -> list[MaterialRequirement]:
        return [MaterialRequirement(item=self.item, quantity=qty * self.qty_per)]

class Assembly(BOMNode):
    def __init__(self, children: list[BOMNode]) -> None:
        self._children = children

    def explode(self, qty: Decimal) -> list[MaterialRequirement]:
        return [req for child in self._children for req in child.explode(qty)]
```

**Project example**: BOM explosion (multi-level bill of materials), Entity hierarchy (Entity > Branch > Site).
**Collaborates with**: Iterator, Visitor.

### Decorator

**Intent**: Attach additional behavior dynamically by wrapping objects.

```python
class AuditedService:
    """Decorator that adds audit logging to any service."""
    def __init__(self, inner: DocumentService, logger: AuditLogger) -> None:
        self._inner = inner
        self._logger = logger

    def confirm(self, doc_id: UUID) -> Document:
        result = self._inner.confirm(doc_id)
        self._logger.log_action("confirm", doc_id, result.status)
        return result
```

**Project example**: Audit logging, permission checking, caching around services.
**Collaborates with**: Chain of Responsibility, Proxy.

### Facade

**Intent**: Provide a simple interface to a complex subsystem.

```python
class BREFacade:
    """Single entry point for all Business Rule Engine operations."""
    def __init__(self, pricing: PricingEngine, validation: ValidationEngine, tax: TaxEngine) -> None:
        self._pricing = pricing
        self._validation = validation
        self._tax = tax

    def process_order(self, order: SalesOrder) -> ProcessedOrder:
        self._validation.validate(order)
        priced = self._pricing.apply(order)
        return self._tax.calculate(priced)
```

**Project example**: BRE engine access (5 engines behind one facade).
**Collaborates with**: Abstract Factory, Singleton.

### Flyweight

**Intent**: Share common state between many objects to save memory.

```python
class FeatureFlagCache:
    _flags: dict[str, FeatureFlag] = {}

    @classmethod
    def get(cls, flag_key: str) -> FeatureFlag:
        if flag_key not in cls._flags:
            cls._flags[flag_key] = FeatureFlag.objects.get(key=flag_key)
        return cls._flags[flag_key]
```

**Project example**: Feature flag definitions shared across requests.
**Collaborates with**: Singleton, Factory Method.

### Proxy

**Intent**: Control access to an object (lazy loading, access control, caching).

```python
class CachedEntitlementService:
    """Caching proxy for entitlement lookups."""
    def __init__(self, inner: EntitlementService, cache: Redis) -> None:
        self._inner = inner
        self._cache = cache

    def get_flags(self, tenant_id: UUID) -> FlagSet:
        cached = self._cache.get(f"flags:{tenant_id}")
        if cached:
            return FlagSet.deserialize(cached)
        flags = self._inner.get_flags(tenant_id)
        self._cache.setex(f"flags:{tenant_id}", 300, flags.serialize())
        return flags
```

**Project example**: Redis-cached entitlement lookups (5min TTL).
**Collaborates with**: Decorator, Adapter.

## Behavioral Patterns

### Chain of Responsibility

**Intent**: Pass request along a chain of handlers until one handles it.

```python
class Middleware(ABC):
    _next: "Middleware | None" = None

    def set_next(self, handler: "Middleware") -> "Middleware":
        self._next = handler
        return handler

    @abstractmethod
    def handle(self, request: HttpRequest) -> HttpResponse | None: ...

    def pass_to_next(self, request: HttpRequest) -> HttpResponse | None:
        if self._next:
            return self._next.handle(request)
        return None
```

**Project example**: 6-middleware pipeline (Auth > Entitlement > RateLimit > Audit > FeatureGate > DBRouter).
**Collaborates with**: Decorator, Composite.

### Command

**Intent**: Encapsulate a request as an object for parameterization, queuing, or undo.

```python
@dataclass
class ConfirmOrderCommand:
    order_id: UUID
    confirmed_by: UUID

    def execute(self, service: SalesOrderService) -> SalesOrder:
        return service.confirm(self.order_id, self.confirmed_by)
```

**Project example**: Celery task payloads, audit trail actions.
**Collaborates with**: Memento (for undo), Chain of Responsibility.

### Iterator

**Intent**: Access elements sequentially without exposing underlying structure.

```python
# Python idiom: generators
def paginate_queryset(queryset: QuerySet, page_size: int = 100):
    """Yield pages of results without loading all into memory."""
    offset = 0
    while True:
        page = list(queryset[offset:offset + page_size])
        if not page:
            break
        yield from page
        offset += page_size
```

**Project example**: Paginated exports, BOM tree traversal.
**Collaborates with**: Composite, Visitor.

### Mediator

**Intent**: Reduce chaotic dependencies by centralizing communication.

```python
class OrderMediator:
    """Coordinates between sales, inventory, and accounting contexts."""
    def __init__(self, inventory: InventoryService, accounting: AccountingService) -> None:
        self._inventory = inventory
        self._accounting = accounting

    def on_order_confirmed(self, order: SalesOrder) -> None:
        self._inventory.reserve_stock(order.lines)
        self._accounting.create_receivable(order)
```

**Project example**: Cross-context coordination (SO confirmed > reserve inventory > create receivable).
**Collaborates with**: Observer, Command.

### Memento

**Intent**: Capture and restore object state without exposing internals.

```python
@dataclass(frozen=True)
class DocumentSnapshot:
    status: str
    data: dict
    timestamp: datetime

class Document:
    def save_snapshot(self) -> DocumentSnapshot:
        return DocumentSnapshot(status=self.status, data=self._to_dict(), timestamp=now())

    def restore(self, snapshot: DocumentSnapshot) -> None:
        self.status = snapshot.status
        self._from_dict(snapshot.data)
```

**Project example**: Document version history, order amendment rollback.
**Collaborates with**: Command, Iterator.

### Observer

**Intent**: Notify dependents automatically when state changes.

```python
# Python/Django idiom: signals
from django.dispatch import Signal

order_confirmed = Signal()  # sender=SalesOrder

# In inventory context:
@receiver(order_confirmed)
def reserve_stock(sender, order: SalesOrder, **kwargs) -> None:
    InventoryService().reserve(order.lines)
```

**Project example**: SO confirmed > reserve inventory, PO received > update stock.
**Collaborates with**: Mediator, Command.

### State

**Intent**: Object behavior changes when its internal state changes.

```python
class OrderState(ABC):
    @abstractmethod
    def confirm(self, order: "SalesOrder") -> "OrderState": ...
    @abstractmethod
    def cancel(self, order: "SalesOrder") -> "OrderState": ...

class DraftState(OrderState):
    def confirm(self, order: SalesOrder) -> OrderState:
        order.confirmed_at = now()
        return ConfirmedState()

    def cancel(self, order: SalesOrder) -> OrderState:
        order.cancelled_at = now()
        return CancelledState()

class ConfirmedState(OrderState):
    def confirm(self, order: SalesOrder) -> OrderState:
        raise InvalidTransition("Already confirmed")

    def cancel(self, order: SalesOrder) -> OrderState:
        order.cancelled_at = now()
        return CancelledState()
```

**Project example**: SalesOrder, PurchaseOrder, Invoice lifecycle (Draft > Confirmed > Completed/Cancelled).
**Collaborates with**: Strategy, Template Method.

### Strategy

**Intent**: Define a family of algorithms, make them interchangeable.

```python
# Python idiom: callable parameter
from typing import Callable

NumberStrategy = Callable[[str, int], str]

def sequential_number(prefix: str, sequence: int) -> str:
    return f"{prefix}-{sequence:06d}"

def date_based_number(prefix: str, sequence: int) -> str:
    return f"{prefix}-{date.today():%Y%m}-{sequence:04d}"

class NumberGenerator:
    def __init__(self, strategy: NumberStrategy) -> None:
        self._strategy = strategy

    def generate(self, prefix: str, sequence: int) -> str:
        return self._strategy(prefix, sequence)
```

**Project example**: Number generators, tax calculators, pricing engines (vary by tenant config).
**Collaborates with**: Factory Method, Template Method.

### Template Method

**Intent**: Define algorithm skeleton, let subclasses override specific steps.

```python
class BaseDocumentService(ABC):
    def create(self, data: dict) -> Document:
        doc = self._build_document(data)
        self._validate(doc)
        self._assign_number(doc)
        self._post_create_hook(doc)
        doc.save()
        return doc

    @abstractmethod
    def _build_document(self, data: dict) -> Document: ...

    @abstractmethod
    def _validate(self, doc: Document) -> None: ...

    def _post_create_hook(self, doc: Document) -> None:
        """Override in subclasses for side effects."""
        pass
```

**Project example**: BaseDocumentService shared by SalesOrder, PurchaseOrder, Invoice services.
**Collaborates with**: Strategy, Factory Method.

### Visitor

**Intent**: Define new operations on object structure without modifying the objects.

```python
# Python idiom: singledispatch
from functools import singledispatch

@singledispatch
def calculate_tax(item) -> Decimal:
    raise NotImplementedError(f"No tax rule for {type(item)}")

@calculate_tax.register
def _(item: PhysicalGood) -> Decimal:
    return item.price * Decimal("0.10")

@calculate_tax.register
def _(item: Service) -> Decimal:
    return item.price * Decimal("0.06")
```

**Project example**: Tax calculation varying by item type, report generation across document types.
**Collaborates with**: Composite, Iterator.
