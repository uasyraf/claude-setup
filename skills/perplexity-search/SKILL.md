---
name: perplexity-search
description: Perform AI-powered web searches with real-time information using Perplexity models via LiteLLM and OpenRouter. This skill should be used when conducting web searches for current information, finding recent scientific literature, getting grounded answers with source citations, or accessing information beyond the model's knowledge cutoff.
---

# Perplexity Search

## Overview

Perform AI-powered web searches using Perplexity models through LiteLLM and OpenRouter. Perplexity provides real-time, web-grounded answers with source citations.

## When to Use

- Searching for current information or recent developments
- Finding latest scientific publications and research
- Getting real-time answers grounded in web sources
- Verifying facts with source citations
- Conducting literature searches across multiple domains

## Setup

1. Get OpenRouter API key from https://openrouter.ai/keys
2. Set environment variable: `export OPENROUTER_API_KEY='sk-or-v1-your-key'`
3. Install: `uv pip install litellm`

## Available Models

| Model | Use Case | Cost |
|-------|----------|------|
| `sonar-pro` (default) | General search, best balance | Low |
| `sonar-pro-search` | Advanced agentic multi-step search | High |
| `sonar-reasoning-pro` | Step-by-step analytical reasoning | Medium |
| `sonar` | Simple fact lookups, most economical | Lowest |

## Usage

```bash
# Simple search
python scripts/perplexity_search.py "Latest developments in CRISPR gene editing?"

# Save results
python scripts/perplexity_search.py "Recent CAR-T therapy trials" --output results.json

# Use specific model
python scripts/perplexity_search.py "Compare mRNA vs viral vector vaccines" --model sonar-pro-search
```

## Programmatic Access

```python
from scripts.perplexity_search import search_with_perplexity

result = search_with_perplexity(
    query="What are the latest CRISPR developments?",
    model="openrouter/perplexity/sonar-pro",
    max_tokens=4000,
    temperature=0.2,
)

if result["success"]:
    print(result["answer"])
```

## Query Design Tips

- Be specific: include domain, time frame, and constraints
- Use domain-appropriate terminology
- Specify preferred source types (peer-reviewed, clinical trials, etc.)
- Break complex questions into clear components

## Integration

Complements `research-lookup` for academic queries, `scientific-writing` for reference finding, and `hypothesis-generation` for gap identification.
