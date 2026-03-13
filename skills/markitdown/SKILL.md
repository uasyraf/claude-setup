---
name: markitdown
description: Convert various file formats to Markdown using Microsoft's MarkItDown tool. Supports 15+ formats including PDF, DOCX, PPTX, XLSX, images (OCR), audio (transcription), HTML, CSV, JSON, XML, ZIP, EPUB, and YouTube URLs.
---

# MarkItDown

## Overview

A Python tool developed by Microsoft for converting various file formats to LLM-friendly Markdown. Supports 15+ file types with optional OCR and transcription capabilities.

## Supported Formats

| Category | Formats |
|----------|---------|
| Documents | PDF, DOCX, PPTX, XLSX, EPUB |
| Web | HTML, CSV, JSON, XML |
| Media | Images (with OCR), Audio (with transcription) |
| Archives | ZIP |
| Other | YouTube URLs |

## Installation

```bash
pip install 'markitdown[all]'
```

## Usage

### Command Line

```bash
# Convert a file
markitdown document.pdf -o output.md

# Convert with specific options
markitdown presentation.pptx -o slides.md
```

### Python API

```python
from markitdown import MarkItDown

md = MarkItDown()
result = md.convert("document.pdf")
print(result.text_content)
```

### With LLM Enhancement

```python
from markitdown import MarkItDown

# Enable AI-powered image descriptions via OpenRouter
md = MarkItDown(llm_client=openrouter_client)
result = md.convert("image.png")
```

## Advanced Features

- **Plugin support** for custom format handlers
- **Streaming** for large files
- **Batch processing** for multiple files
- **Azure Document Intelligence** for enhanced PDF conversion

## Integration

Pairs well with scientific writing and literature review workflows for processing research papers and documents into LLM-consumable format.
