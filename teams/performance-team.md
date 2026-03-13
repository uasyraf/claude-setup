---
name: performance-team
description: Performance profiling, bottleneck identification, and optimization.
lead: analyst
trigger: Performance profiling, optimization, latency investigation
min_complexity: 3
members: [explorer, analyst, coder, reviewer]
---

## Workflow

1. **Explorer** — Identify hot paths, data flow, and resource usage patterns
2. **Analyst** — Profile and benchmark: measure before optimizing, establish baselines
3. **Coder** — Implement targeted optimizations based on profiling data
4. **Reviewer** — Verify optimizations are correct and measure improvement

## Coordination
- No optimization without measurement — analyst establishes baseline first
- Coder optimizes one bottleneck at a time with before/after benchmarks
- Reviewer verifies no correctness regressions from optimizations
