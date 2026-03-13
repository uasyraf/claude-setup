---
name: php
description: PHP coding standards — strict_types, PSR-12, Laravel conventions, FormRequest validation.
type: language
globs: "**/*.php"
---

## PHP Standards

### Fundamentals
- `declare(strict_types=1);` at the top of every file
- PSR-12 coding style
- PHP 8.1+ features: enums, readonly properties, fibers, intersection types
- Type declarations on all parameters, returns, and properties

### Laravel
- FormRequest classes for input validation (not inline validation)
- Eloquent scopes over raw where chains for reusable queries
- Resource controllers and API Resources for consistent responses
- Service classes for complex business logic (not in controllers)
- Events and listeners for side effects (not in the main flow)

### Testing
- Pest PHP or PHPUnit
- Feature tests for HTTP endpoints, unit tests for services
- Database factories and seeders for test data
- `RefreshDatabase` trait for test isolation

### Security
- Mass assignment protection: `$fillable` explicitly defined
- Always use parameterized queries (Eloquent handles this)
- CSRF protection on all state-changing routes
- Validate and sanitize file uploads
