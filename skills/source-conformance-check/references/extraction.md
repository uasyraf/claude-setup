# Extraction guidance

Phase 2 of the protocol turns whatever the user supplied into clean markdown that workers and verifiers can quote from. The choice of extractor matters: bad extraction is the most common upstream cause of false UNGROUNDED verdicts in Phase 6, because the worker quotes the rendered text but the verifier re-checks against a differently-normalised version.

## Image handling (CRITICAL — read this first)

`markitdown` extracts text only by default. Embedded images, figures, diagrams, charts, and screenshots either become an empty `![](image_ref)` marker in the output, or are dropped silently with only their surrounding caption text remaining. Comparison runs that ignore this lose any divergences that live in image content — a flow diagram that changed, a screenshot whose annotation moved, a chart whose axis labels were edited — and the report falsely shows clean conformance on the affected regions.

Every extraction phase MUST follow this image protocol.

### 1. Detect images BEFORE handing the markdown to chunking

| Source | Detection command |
|---|---|
| PDF | `pdfinfo <file>` reports overall image count; `pdfimages -list <file>` itemises with page numbers |
| DOCX | `unzip -l <file>` lists `word/media/*` entries — each is an embedded image |
| PPTX | `unzip -l <file>` lists `ppt/media/*` |
| XLSX | `unzip -l <file>` lists `xl/media/*` |
| HTML / markdown | `grep -nE '<img\|!\[.*\]\('` |

### 2. Build an image manifest per source

Write `master.images.json` and `slave.images.json` alongside the normalised text:

```json
[
  {
    "anchor": "page-12  OR  Section 4.3 > 'Workflow Diagram'",
    "image_filename": "image1.png or null",
    "kind": "diagram | photo | chart | screenshot | table-image | other",
    "caption_text": "the caption or surrounding text that anchored this image",
    "ocr_status": "extracted | unread | not-attempted"
  }
]
```

### 3. For each detected image, take ONE of these paths in priority order

a) **Re-run markitdown with OCR backends enabled** (`pip install 'markitdown[all]'` is the umbrella install that pulls in the OCR + Whisper extras). For each image where OCR returned readable text, embed the OCR text inline at the image's anchor in the normalised markdown with a clear marker:

```
<!-- image-ocr begin [<anchor>] kind=<kind> -->
<OCR text>
<!-- image-ocr end -->
```

Set `ocr_status: "extracted"` in the manifest.

b) **If OCR fails, returns gibberish, or the backend is not available**, insert a placeholder at the anchor:

```
<!-- image-unread [<anchor>] kind=<kind> caption="<surrounding caption text>" -->
```

Set `ocr_status: "unread"` in the manifest. The chunker treats the placeholder as a single token-light entry; workers and verifiers see it and know the content is unread.

### 4. The report's Methodology section MUST disclose image accounting honestly

`"N images detected in master (M OCR-extracted, K flagged unread). N images detected in slave (M OCR-extracted, K flagged unread)."`

If unread images are present, add a one-line warning: `"Workers cannot find divergences inside unread images; manual review is required to confirm those regions are conformant."`

This is non-negotiable. Silent image-drop is the most common way a conformance report gives a false-clean verdict on documents whose real divergence lives in a diagram. The scout in Phase 3 reports its own `image_locations` based on the post-extraction markdown — if its counts disagree with the manifest built here, the manifest wins (it came from the original file) and the discrepancy is itself logged in the report's Integrity section.

## Per-format defaults

### Markdown, plain text, source code
Use `Read` directly. No transformation. Preserve original whitespace because verifier verbatim checks depend on it.

### PDF (text-based, not scanned)
Prefer the `markitdown` skill (`md.convert("path.pdf").text_content`). It preserves heading structure better than raw `pdftotext`.

Fallback if `markitdown` is unavailable:
```bash
pdftotext -layout -nopgbrk <input.pdf> -
```
`-layout` retains column structure; `-nopgbrk` suppresses form-feed page separators that confuse chunk alignment.

For each section, retain a page-number anchor by capturing the page breaks that `pdftotext` emits as `\f`. Re-emit them as `<!-- page <N> -->` HTML comments in the normalised markdown so workers can cite pages in their `master_location` field.

### PDF (scanned, image-only)
`pdftotext` will return blank. Use `markitdown` with the OCR extra enabled (`pip install 'markitdown[all]'` includes the OCR backends). If OCR returns garbled text (common for low-DPI scans), stop and report to the user — running comparison on OCR garbage produces meaningless findings and inflates the verifier's UNGROUNDED rate to near 100%.

### DOCX
`markitdown` is the only sensible choice. It preserves headings, lists, tables, and tracked changes (tracked changes show as inline annotations — leave them in, they often carry the most-relevant divergence signal).

### XLSX / CSV
Convert via `markitdown`. Each sheet becomes a markdown table. For wide tables (>10 columns), the rendered markdown gets unreadable — in that case, ask the user whether they want a focused column subset before proceeding.

### HTML / web URL
Use the `obsidian:defuddle` skill — it strips chrome and gives clean reader content. Falling through `Read` of raw HTML drowns the worker in nav/script noise.

### PPTX
`markitdown` extracts slide text and notes. The notes pane often holds the canonical wording — make sure both master and slave are extracted with notes included (markitdown does this by default).

## Normalisation rules (apply to BOTH master and slave identically)

The verifier's verbatim check is liberal on punctuation but strict on words. To keep the verifier from over-flagging UNGROUNDED, normalise both sources identically before chunking:

1. Convert smart quotes to straight quotes (`’` → `'`, `“` → `"`).
2. Convert en-dash and em-dash to hyphen (`–` `—` → `-`).
3. Collapse runs of whitespace to single spaces, EXCEPT inside fenced code blocks and tables.
4. Strip page-break form-feeds; keep page anchors as comments.
5. Lowercase nothing. Casing carries meaning (especially for proper nouns, acronyms, code identifiers).

Do NOT normalise:
- Numbers and units (preserve `1,234.56` vs `1234.56` distinctions — these are often the real divergence)
- Acronyms or expansion (`SRS` vs `Software Requirements Specification` — flag as DIVERGENT if they don't match, do not silently equate)
- Code identifiers (case-sensitive)

## File hygiene

Write normalised output to a per-run temp directory: `/tmp/scc-<timestamp>/master.md`, `/tmp/scc-<timestamp>/slave.md`. Keep the temp files for the duration of the run so verifiers can reference them. Delete after the report is written, unless the user asked to retain intermediates for debugging.
