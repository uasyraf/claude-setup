---
name: java
description: Java coding standards — Java 17+, records, Spring Boot conventions, JUnit 5 with Mockito.
type: language
globs: "**/*.java"
---

## Java Standards

### Language
- Java 17+ features: records, sealed classes, pattern matching, text blocks
- Records for DTOs and value objects
- Sealed interfaces for restricted type hierarchies
- `var` for local variables when the type is obvious from context

### Spring Boot
- Constructor injection (no `@Autowired` on fields)
- `@Configuration` classes over XML config
- Profiles for environment-specific configuration
- `@Validated` on controller parameters with Bean Validation annotations
- ResponseEntity for explicit HTTP response control

### Testing
- JUnit 5 (`@Test`, `@Nested`, `@ParameterizedTest`)
- Mockito for mocking dependencies
- `@SpringBootTest` sparingly — prefer unit tests with mocks
- AssertJ for fluent assertions
- Testcontainers for integration tests requiring external services

### Style
- Package by feature, not by layer
- Interface + implementation only when multiple implementations exist
- Streams over loops for collection transformations
- Optional for return types that may be absent, never for parameters
