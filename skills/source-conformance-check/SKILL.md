---
name: source-conformance-check
description: Compare two text sources (files, PDFs, docx, markdown, plain text) one-against-one, where one is the reference (master) and the other should follow it (slave/candidate). Uses divide-and-conquer with parallel worker subagents and a dedicated verifier pass that grounds every claim against source text to flag hallucinated findings. Use this skill whenever the user asks to compare A against B, check if A follows B, verify conformance or compliance between two documents, audit a derived document against its source, check for unauthorized or unintended changes, or validate that an implementation/draft/translation matches its spec — even when they do not literally use the words "master" or "slave". Trigger phrases include "compare X to/against/with Y", "is X following Y", "does X conform to Y", "check X against Y", "verify X matches Y", "audit X vs Y", "what changed between X and Y where X is the reference", "is the vault following the SRS", "does the implementation match the spec".
---

# Source Conformance Check

Compare two text sources where one is a fixed reference (master) and the other is expected to follow it (slave). The skill produces a structured, evidence-cited report of divergences, omissions, and unsanctioned additions, with every claim verified against source text by an independent agent pass to suppress hallucination.

## When to invoke

Trigger on requests that frame two documents asymmetrically — one is the source of truth, the other is being audited against it. Examples of intent that should activate this skill:

- "Compare these two SRS versions — v3 is the agreed one."
- "Is the vault note still following the source PDF?"
- "Does this docx draft match the spec we signed off on?"
- "Audit the implementation notes against the API spec."
- "Check whether the translation faithfully follows the original."
- "What changed between A and B? A is the reference."

Do **not** invoke for symmetric diffs ("show me a diff between these two files"), pure character-level comparison (`diff`/`git diff` is the right tool), or comparisons between three or more sources (use repeated pairwise runs).

## Inputs

The user must (eventually) supply:
- **Master path** — the reference document. Required.
- **Slave path** — the candidate. Required.
- **Scope hint** (optional) — sections to focus on, sections to ignore.
- **Output destination** (optional, default: report printed inline + saved to `./conformance-report-<timestamp>.md`).

If either path is missing, ask once for both, then proceed.

## Preconditions (check before Phase 1)

This skill MUST run from a top-level Claude session, not from inside another subagent. The protocol relies on two capabilities the harness restricts in nested-subagent contexts:

1. **`Agent` tool dispatch** — Phases 3, 5, and 6 dispatch scouts, workers, and verifiers in parallel via `Agent`. A nested subagent cannot spawn its own subagents; parallel dispatch is unavailable and the verifier loses the context-isolation that gives it independence.
2. **`Write` to `/tmp/scc-*/`** — Phase 2 writes the normalised text and image manifests; Phase 7 writes the final report.

Pre-flight check, performed before any Phase 1 work:

- Confirm `Agent` is in the available tools list.
- Confirm `Write` to `/tmp/scc-precheck-<run-id>/.touch` succeeds, then remove it.

If either check fails, **stop immediately** and tell the user:

> "This skill requires a top-level Claude session. The current context appears to be a nested subagent (Agent dispatch or /tmp writes unavailable). Please re-invoke the comparison from your main session — say 'compare X against Y' directly to Claude, rather than asking another agent to run this skill on your behalf."

Do not attempt a degraded inline simulation. A report whose verifier pass had no context isolation is no longer an independent check — silently shipping one would falsely advertise an anti-hallucination guarantee the run did not actually provide.

## Protocol (seven phases)

Each phase has a clear handoff; do not skip phases even when the documents are small. The verifier phase is the load-bearing anti-hallucination guarantee — never elide it. The scout phase is the safety net for ridiculously large inputs and for prompts that did not name a scope — never skip it once either condition is met.

### Phase 1 — Identify the pair and the reading of asymmetry

State back to the user:
- Master: `<path>` (reference, fixed)
- Slave: `<path>` (must follow master)

If the user's framing is ambiguous about which is master, ask **one** sharp question and stop until answered.

### Phase 2 — Normalize both sources to plain markdown

| Source format | Tool |
|---|---|
| `.md`, `.txt`, `.rst`, source code | `Read` directly |
| `.pdf` | `markitdown` skill (preferred) or `pdftotext -layout <in> -` as fallback |
| `.docx`, `.pptx`, `.xlsx`, `.epub`, `.html` | `markitdown` skill |
| URL | `obsidian:defuddle` skill |

For deeper guidance on each format (page-number anchoring, table preservation, OCR fallback for scanned PDFs, **image handling**), see `references/extraction.md`.

**Image handling is a hard requirement.** `markitdown` silently drops embedded image content unless OCR backends are enabled, which would otherwise produce false-clean conformance verdicts on documents whose real divergences live in diagrams, screenshots, or charts. Before chunking, build an image manifest per source (count + anchors), then either OCR each image and embed the text at its anchor or flag it as `unread`. The full procedure is in `references/extraction.md` under "Image handling".

Write the normalised text of each source to a temp file under `/tmp/scc-<run-id>/master.md` and `/tmp/scc-<run-id>/slave.md`. Save the image manifests alongside as `master.images.json` and `slave.images.json`. The chunk-pair JSON shipped to workers references these paths.

### Phase 3 — Scout the structure and lock scope

Triggered when EITHER:
- Combined normalised tokens of master + slave > 10,000, OR
- Combined tokens > 4,000 AND the user's prompt did not name a scope (no section / chapter / clause / page references, no named topics like "the audit section", no explicit "focus on X" language).

Skipped when:
- Combined tokens ≤ 4,000 (tiny — the chunker handles directly with no structural help needed), OR
- Combined tokens are 4k–10k AND the user named a specific scope (the named scope already serves as the structural map).

**Procedure**

a) Dispatch two scout subagents in parallel — one per source. Use `subagent_type: general-purpose`. Each receives only its document path; they do not compare anything to each other.

b) Each scout returns a structural map (JSON). Scout prompt template:

```
You are a scout for the source-conformance-check skill. Read the document
at <path> and produce a structural map. You are NOT comparing anything.
Your job is to surface the structure so the coordinator can scope the
comparison sensibly and so the chunker has anchors to align against.

OUTPUT — JSON ONLY, no prose, no markdown fences

{
  "doc_path": "<path>",
  "total_tokens_estimate": <int>,
  "image_locations": [
    { "anchor": "<heading path or page>",
      "kind": "diagram|photo|chart|screenshot|table-image|other",
      "caption_if_any": "<surrounding caption text, or empty>" }
  ],
  "structure": [
    {
      "anchor": "1",
      "title": "Introduction",
      "tokens_estimate": 850,
      "gloss": "8-15 word factual summary of what this section covers",
      "children": [ ...same shape, recursive... ]
    }
  ]
}

RULES
- Token estimate: rough OK. You do not need to count exactly.
- Gloss: 8-15 words, factual, no evaluative language.
- DO NOT compare master vs slave. That is the worker's job.
- image_locations: include every image, figure, diagram, chart, or
  screenshot you encounter — whether visible as `![](...)` markers or
  inferable from a caption that stands alone where extraction dropped
  the image.
- If the document is unstructured prose with no headings, emit one leaf
  per ~1500 tokens with anchor "para 1-N", "para N+1-2N", etc., and a
  one-line gloss of each.
```

c) Merge the two maps side-by-side. Match sections by normalised heading text (case-insensitive, punctuation-stripped, numeric prefix tolerated) or by anchor. Tag each section as `master-only`, `slave-only`, or `both`.

d) Sanity-check the scouts' `image_locations` against the image manifests built in Phase 2. If the counts disagree, the manifest wins (it came from the original file, not the post-extraction markdown) — log the discrepancy in the report's Integrity section.

e) **Scope decision routing:**

| Situation | Action |
|---|---|
| User prompt named scope AND scoped region ≤ 32k tokens | Restrict chunking to named sections. Skip Phase 3.5. |
| User prompt named scope BUT scoped region > 32k tokens | Run Phase 3.5 to subdivide further. |
| User prompt open-ended AND combined ≤ 8k tokens | Compare everything. Skip Phase 3.5. |
| User prompt open-ended AND combined > 8k tokens | Run Phase 3.5. |

### Phase 3.5 — Ask the user for scope (only when Phase 3 routes here)

Use the `AskUserQuestion` tool. Construct the question dynamically from the merged scout map:

- `question`: `"The two documents are <X>k tokens combined. What scope should I compare?"` (substitute the actual combined size)
- `header`: `"Scope"`
- `multiSelect`: `true` (the user may want several top-level sections)
- `options`: up to 4 entries. The first N-1 are the largest top-level sections by token count — label each with the section title + token estimate; description = scout's gloss + presence tag (`master-only` / `slave-only` / `in both`). The final option is `"Everything"` — include this ONLY when combined scoped tokens ≤ 32k.

If `"Everything"` cannot be offered because the doc is too large, lead with the top sections as individual options and frame the final option as `"Narrower custom scope"` so the user can free-text a more specific selection. Never silently default to everything on a large document — the comparison budget is too valuable to spend on regions the user does not care about, and worker dispatch on a too-large scope produces a diluted report.

If the user selects nothing or cancels, stop the run and report back the scout map — do not proceed with an undefined scope.

Apply the selected scope to the merged map: keep only the chosen sections and pass that scoped map to Phase 4 as the structural input for Strategy A in `references/chunking-strategies.md`.

### Phase 4 — Chunk both sources into aligned pairs

If Phase 3 produced scout maps, use them as the structural input for Strategy A below. If Phase 3 was skipped (small doc + named scope), detect structure directly from the documents.

The goal is a list of `(master_chunk, slave_chunk, anchor)` triples that each worker can compare independently. Strategy selection:

| Both sources have parallel structure (matching headings / numbered sections / clause IDs) | Align by structural anchor. One chunk per top-level section. |
| Master has structure, slave is freeform | Use master's sections as anchors; for each master section, extract the slave passage most lexically similar (BM25-style keyword overlap is fine, no embedding model required). |
| Neither has clear structure | Split master into N roughly token-balanced windows (target 1.5-2.5k tokens each, sentence-aligned). For each master window, take the lexically nearest slave window of similar size. |

Worker count: `N = min(8, max(2, ceil(master_tokens / 2000)))`. Cap at 8 to keep parallel dispatch tractable. For documents under ~1.5k tokens total, use N=1 (single worker, but still run the verifier).

Always include a "global tail" pseudo-chunk: the slave-only sections that no master chunk anchored to. Workers can flag the entire tail as EXTRA-or-justified. Decision-rule details and edge cases in `references/chunking-strategies.md`.

### Phase 5 — Dispatch workers in parallel

For each chunk pair, dispatch a worker subagent in the same message (parallel batch). Worker prompt template — substitute the bracketed placeholders:

```
You are a comparison worker for the source-conformance-check skill.

CONTRACT
You are given one chunk of a MASTER document (the reference) and one chunk
of a SLAVE document (the candidate that should follow master). Report where
the slave fails to follow the master.

INPUT
=== MASTER chunk [<anchor>] ===
<verbatim master chunk text>
=== END MASTER ===

=== SLAVE chunk [<anchor>] ===
<verbatim slave chunk text>
=== END SLAVE ===

WHAT TO REPORT
A finding is one of:
- MISSING — concept/clause/datum present in master but absent in slave
- DIVERGENT — concept/clause/datum present in both but they disagree
- EXTRA — concept/clause/datum present only in slave AND it appears to
  contradict, undermine, or quietly extend master scope. Do NOT flag
  benign elaborations or examples that are consistent with master.

For each finding, emit a JSON object with these fields:
  type             — "MISSING" | "DIVERGENT" | "EXTRA"
  topic            — 3-7 word label
  master_quote     — VERBATIM excerpt from master chunk, max 240 chars.
                     Empty string for EXTRA findings.
  master_location  — heading path, paragraph index, or "n/a" for EXTRA
  slave_quote      — VERBATIM excerpt from slave chunk, max 240 chars.
                     Empty string for MISSING findings.
  slave_location   — heading path, paragraph index, or "n/a" for MISSING
  description      — 1-2 sentences explaining the discrepancy in plain English
  severity         — "high" | "medium" | "low"
                     high = changes contractual / behavioural meaning
                     medium = changes detail or specificity
                     low = stylistic or formatting
  confidence       — "high" | "medium" | "low"
                     low = you are unsure this is really a divergence

RULES
1. Quote VERBATIM. A verifier will recheck every quote character-for-character.
   Whitespace and punctuation may be normalised but substantive words may not.
2. If a passage is rephrased but means the same thing, do NOT flag it.
3. Bias toward over-reporting at low confidence over silent omission. The
   verifier will downgrade or drop unsupported findings.
4. Do not invent quotes. If you cannot find a verbatim excerpt that supports
   a finding, drop the finding.
5. Output a single JSON array of finding objects. No prose, no markdown
   fences, no commentary. An empty array [] is a valid output meaning
   "slave conforms to master for this chunk".

ANCHOR
<anchor>  (echo this back as the first element of your response, on its own
            line, prefixed with "# anchor: ", so the coordinator can route
            your output. Then a blank line. Then the JSON array.)
```

Use `subagent_type: general-purpose` (or `claude`) for workers. Keep each prompt self-contained — the worker should not need to read any file. Inline the chunk text directly into the prompt.

### Phase 6 — Verify each worker (anti-hallucination pass)

For each worker output, dispatch a **separate** verifier subagent. Do not let the worker self-verify. The verifier re-reads the same source chunks and grades each worker claim independently.

Verifier prompt template:

```
You are a verifier for the source-conformance-check skill. A worker has
produced findings comparing a MASTER chunk against a SLAVE chunk. Check
each finding against the actual source text. The point of this pass is to
catch hallucinated quotes, misattributed text, and misread divergences.

INPUT
=== MASTER chunk [<anchor>] ===
<verbatim master chunk text>
=== END MASTER ===

=== SLAVE chunk [<anchor>] ===
<verbatim slave chunk text>
=== END SLAVE ===

=== WORKER FINDINGS (JSON array) ===
<worker JSON output>
=== END FINDINGS ===

CHECKS PER FINDING
1. master_quote must appear in the master chunk as a verbatim substring,
   allowing only whitespace and unicode-punctuation flexibility (e.g. ’
   vs ', en-dash vs hyphen). Substantive word substitutions are NOT
   allowed.
2. slave_quote must appear in the slave chunk under the same rule.
3. The description must accurately characterise the relationship between
   the two quotes. If it embellishes, misreads, or imports outside
   knowledge, it fails.
4. The type (MISSING/DIVERGENT/EXTRA) must match the evidence:
   - MISSING requires non-empty master_quote, empty slave_quote, and
     genuine absence of the concept in slave.
   - DIVERGENT requires both quotes non-empty AND a substantive
     disagreement (not a rephrasing).
   - EXTRA requires non-empty slave_quote, empty master_quote, AND the
     slave content meaningfully extends or contradicts master scope.

For each finding (by index in the worker array) emit:
  finding_index    — integer
  verdict          — "VERIFIED" | "UNGROUNDED" | "CONTRADICTED" | "PARTIAL"
                     VERIFIED      = passes all checks
                     UNGROUNDED    = a quote is not in the source (hallucination)
                     CONTRADICTED  = quotes are real but description misreads them
                     PARTIAL       = type or severity wrong, or finding overstates
  evidence         — short note. For UNGROUNDED, say which quote failed and what
                     the source actually says nearby. For CONTRADICTED, give the
                     correct reading.
  corrected_finding — full finding object with fixes, OR null if VERIFIED.
                      For UNGROUNDED, set to null (drop).

Then, scan the chunks yourself for divergences the worker clearly missed.
Add at most 3 to a "missed_findings" array using the same finding schema as
the worker (but tag each with confidence: "medium" — the worker is the
primary lens, you are the safety net).

OUTPUT
A single JSON object:
{
  "anchor": "<echo the anchor>",
  "verifications": [ ... per-finding objects ... ],
  "missed_findings": [ ... worker-schema objects ... ]
}

No prose. No markdown fences. JSON only.
```

Dispatch all verifiers in parallel once all workers have returned. Do not start the verifier pass until every worker has reported — partial verification creates inconsistent reports.

### Phase 7 — Merge and report

Combine all verifier outputs:
1. Keep findings where verdict ∈ {VERIFIED, PARTIAL} (use `corrected_finding` for PARTIAL).
2. Drop findings where verdict ∈ {UNGROUNDED, CONTRADICTED}, but **count them** for the integrity section of the report.
3. Append `missed_findings` from each verifier, marked as "second-pass".
4. Sort by severity (high → low), then by master_location.

Write the report per the template in `references/report-format.md`. The report is the deliverable — print a summary inline (verified-finding count, hallucination count, severity breakdown) and save the full report to disk at the destination path. Always tell the user the path.

## Failure modes and escalation

| Symptom | Diagnosis | Action |
|---|---|---|
| Extraction yields empty text | Scanned PDF / image-only docx | Re-extract via markitdown with OCR enabled; if still empty, stop and tell user |
| Scoped region (after Phase 3.5) is still >32k tokens | Document too large even after user-selected scoping | Re-invoke `AskUserQuestion` with a finer subdivision (sub-sections, page ranges); never proceed silently with a degraded analysis on a doc this size |
| Images detected but OCR returns empty / gibberish | Low-DPI scan, unsupported encoding, OCR backend missing | Mark those anchors `unread` in the manifest; surface in Methodology section; do NOT silently mark the doc conformant in those regions |
| Scout's `image_locations` disagrees with Phase-2 manifest | Extraction step dropped images that scout cannot see | Trust the Phase-2 manifest (built from the original file). Log the discrepancy in Integrity section. |
| Worker returns invalid JSON | Worker hallucinated or hit length limit | Retry once with a shorter chunk; if it fails again, mark that anchor as `worker_failed` in the report rather than fabricating findings |
| Verifier UNGROUNDED rate > 30% on any worker | That worker is hallucinating systematically | Re-run that worker with a fresh subagent dispatch; if still > 30%, include a hallucination warning in the report's integrity section |
| Verifier itself UNGROUNDED a finding the user can confirm is real | Verifier was too strict on punctuation/whitespace | Note as a known limitation; in iteration, relax the verbatim rule further |

## Output guarantees

Every claim in the final report carries:
- A verbatim quote from master (or marked empty for EXTRA)
- A verbatim quote from slave (or marked empty for MISSING)
- A location anchor in each source
- An independent verifier verdict (VERIFIED or PARTIAL)
- A severity and confidence rating

No finding survives to the report without independent verification. The report's "Integrity" section discloses how many worker findings were dropped as UNGROUNDED or CONTRADICTED — this number is the skill's honest measure of its own noise floor on this run.

## What this skill does NOT do

- Three-way merge or N-way comparison. Pairwise only.
- Byte-level diff (`diff -u` is faster and exact for that).
- Symmetric "what changed between two versions" without a designated reference — that's a different protocol with different reporting.
- Auto-applying fixes to the slave. The skill reports; the human or a separate skill remediates.
