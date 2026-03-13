---
name: csharp
description: C# coding standards — C# 12+/.NET 8+, nullable references, xUnit testing, EF Core patterns.
type: language
globs: "**/*.cs,**/*.csproj"
---

## C# Standards

### Language
- C# 12 / .NET 8+ features: primary constructors, collection expressions, required members
- Nullable reference types enabled (`<Nullable>enable</Nullable>`)
- Records for immutable data types
- `file`-scoped namespaces (single line, not block)
- Pattern matching over type checking and casting

### ASP.NET Core
- Minimal APIs for simple endpoints, controllers for complex ones
- Dependency injection via constructor (no service locator pattern)
- Options pattern for configuration (`IOptions<T>`)
- Middleware pipeline order matters — document why

### Entity Framework Core
- Code-first migrations
- `DbContext` per unit of work (scoped lifetime)
- Explicit loading or projection over lazy loading
- Value objects as owned types

### Testing
- xUnit as test framework
- FluentAssertions for readable assertions
- NSubstitute or Moq for mocking
- Integration tests with `WebApplicationFactory<T>`
- Test naming: `MethodName_Scenario_ExpectedResult`

### Style
- `async`/`await` all the way (no `.Result` or `.Wait()`)
- `IAsyncEnumerable` for streaming data
- Expression-bodied members for single-line methods/properties
- `sealed` on classes not designed for inheritance
