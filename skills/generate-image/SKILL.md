---
name: generate-image
description: High-quality image creation and editing through OpenRouter AI models (FLUX.2 Pro, Gemini 3 Pro). Use for photos, photorealistic images, artistic illustrations, and conceptual visuals. Not for technical diagrams.
---

# Generate Image

## Overview

Create and edit high-quality images using AI models through OpenRouter. Handles photos, photorealistic images, artistic illustrations, and conceptual visuals.

**Not for**: Technical diagrams, flowcharts, circuit designs — use `scientific-schematics` instead.

## Setup

```bash
# Requires OpenRouter API key
export OPENROUTER_API_KEY='sk-or-v1-your-key'
```

## Available Models

| Model | Capabilities | Default |
|-------|-------------|---------|
| Gemini 3 Pro Image Preview | Generation + Editing | Yes |
| FLUX.2 Pro | Generation + Editing | No |
| FLUX.2 Flex | Generation only (lower cost) | No |

## Usage

```bash
# Generate new image
python scripts/generate_image.py "A beautiful sunset over mountains"

# Edit existing image
python scripts/generate_image.py "Add a rainbow" --input photo.jpg

# Use specific model
python scripts/generate_image.py "Abstract art" --model flux-pro
```

## Important Constraints

- Generated images must NOT display the prompt or instructions used to generate them
- Do not include metadata indicators in the output image
- Describe the desired visual outcome, not the technical process
