# Decision Flowchart

When you detect a smell, follow these paths to the right refactoring technique and (optionally) a design pattern.

## Smell-to-Fix Decision Tree

```
SMELL DETECTED
│
├─ Long Method (> 30 lines)
│  ├─ Contains coherent blocks? → Extract Method
│  ├─ Complex conditional? → Decompose Conditional
│  ├─ Loop doing multiple things? → Extract Method per concern
│  └─ After extraction, extracted methods form a pattern?
│     ├─ Same skeleton, different steps → Template Method
│     └─ Algorithm varies by config → Strategy
│
├─ Large Class (> 500 lines)
│  ├─ Two+ groups of fields used by different methods? → Extract Class
│  ├─ GUI + domain logic mixed? → Extract Class (separate concerns)
│  └─ After extraction, classes share interface? → Extract Interface (Protocol)
│
├─ Switch on Type / Status
│  ├─ Status with transition rules? → State pattern
│  ├─ Algorithm varies by type? → Strategy pattern
│  ├─ Object creation varies? → Factory Method
│  └─ Simple mapping (no behavior)? → Dict dispatch
│
├─ Feature Envy
│  ├─ Method uses another class's data? → Move Method to that class
│  └─ Only part of method is envious? → Extract Method, then Move
│
├─ Shotgun Surgery
│  ├─ Related logic spread across files? → Move Method / Move Field to consolidate
│  ├─ Cross-cutting concern? → Decorator pattern or middleware
│  └─ Configuration scattered? → Extract Class (config object)
│
├─ Duplicate Code
│  ├─ Same class? → Extract Method
│  ├─ Sibling subclasses? → Pull Up Method / Extract Superclass
│  ├─ Unrelated classes? → Extract standalone function or new class
│  └─ After extraction, shared process skeleton? → Template Method
│
├─ Primitive Obsession
│  ├─ Value with validation rules? → Replace Data Value with Object (@dataclass)
│  ├─ Type code affecting behavior? → Replace Type Code with State/Strategy
│  └─ Group of primitives? → Introduce Parameter Object
│
├─ Long Parameter List (> 4 params)
│  ├─ Params travel together? → Introduce Parameter Object (@dataclass)
│  ├─ Param obtainable from existing object? → Replace Parameter with Method Call
│  └─ Boolean/flag param? → Split into separate methods
│
├─ Data Clumps
│  ├─ Same field group in 3+ places? → Extract Class (@dataclass)
│  └─ Same params in 3+ methods? → Introduce Parameter Object
│
├─ Message Chains (a.b.c.d)
│  └─ Client needs end result? → Hide Delegate (add method on intermediary)
│
├─ Middle Man (class delegates everything)
│  └─ No added value? → Remove Middle Man (inline or let clients access delegate)
│
└─ Speculative Generality
   ├─ Unused abstract class? → Collapse Hierarchy
   ├─ Unused parameters? → Remove Parameter
   └─ Unused delegation? → Inline Class
```

## Pattern Emergence Guide

After refactoring, check if a design pattern has naturally emerged:

| After This Refactoring | Check For This Pattern |
|------------------------|----------------------|
| Extract Method reveals shared skeleton | Template Method |
| Extract Class creates peer objects | Strategy or State |
| Replace Conditional with Polymorphism | State (lifecycle) or Strategy (algorithm) |
| Move Method consolidates cross-cutting logic | Decorator or Chain of Responsibility |
| Extract Interface from 3+ classes | Factory Method for creation |
| Hide Delegate on multiple levels | Facade |
| Extract Class for tree structure | Composite |

## Quick Decision: "Should I Apply a Pattern?"

```
Is there a code smell? ──No──→ Don't add a pattern. YAGNI.
       │
      Yes
       │
Does a refactoring technique fix it? ──Yes──→ Apply technique. Stop.
       │
      No (or technique reveals deeper structure)
       │
Does complexity match a pattern's signal? ──No──→ Keep it simple.
       │
      Yes
       │
Are there 3+ instances (Rule of Three)? ──No──→ Wait. Duplicate is fine for now.
       │
      Yes
       │
Apply the pattern. Document in patterns.md if non-obvious.
```
