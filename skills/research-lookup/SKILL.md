---
name: research-lookup
description: Real-time academic research queries using Perplexity Sonar models via OpenRouter with intelligent model selection based on query complexity. Use for academic literature searches, protocol lookups, statistical data retrieval, and citation assistance.
---

# Research Information Lookup

## Overview

Real-time academic research through Perplexity's Sonar models via OpenRouter, with automatic model selection based on query complexity.

## Dual Model Architecture

| Model | When Selected | Use Case |
|-------|---------------|----------|
| Sonar Pro Search | Straightforward queries | Fast literature lookups, fact retrieval |
| Sonar Reasoning Pro | Complex analytical queries | Comparative analysis, synthesis, deep reasoning |

## Automatic Model Selection

The system scores query complexity using weighted indicators:
- Reasoning keywords ("compare", "analyze", "explain") = 3 points each
- A single strong analytical keyword typically activates Sonar Reasoning Pro

**Examples:**
- "Recent advances in CRISPR 2024" -> Sonar Pro Search
- "Compare mRNA vs traditional vaccines" -> Sonar Reasoning Pro

## Key Capabilities

- Academic literature searching with full citations
- Technical protocol and methodology lookups
- Statistical data retrieval with source attribution
- Citation assistance for manuscripts
- Integration with scientific writing workflows

## Response Quality Standards

- Peer-reviewed sources prioritized
- Complete bibliographic information with DOIs
- Recent publications (2020-2024 preferred)
- Proper source attribution throughout
- Institutional sources and high-impact journals emphasized

## Setup

Requires OpenRouter API key. Uses 200K+ token context window in academic/scholarly search mode.

```bash
export OPENROUTER_API_KEY='sk-or-v1-your-key'
uv pip install litellm
```

## Complementary Tools

- **WebSearch**: For metadata verification, non-academic sources, DOI lookups
- **scientific-schematics**: For publication-quality visualizations
- **perplexity-search**: For broader web searches beyond academic scope
