# Chunking strategies

Phase 3 produces aligned `(master_chunk, slave_chunk, anchor)` triples. Alignment quality drives finding quality: if a worker is given two unrelated chunks, every paragraph looks divergent and the report becomes useless.

## Decision tree

```
Does master have explicit structural markers (markdown headings, numbered
clauses, slide indices, section numbers)?
├── YES → Does slave share the same structural markers (by ID or normalised heading text)?
│         ├── YES → STRATEGY A: structural alignment
│         └── NO  → STRATEGY B: master-anchored lexical alignment
└── NO  → STRATEGY C: token-window alignment
```

## Strategy A — Structural alignment

Walk master headings/clauses top-down. For each, find the slave heading/clause whose normalised title matches (case-insensitive, punctuation-stripped, optional numeric prefix tolerated). Pair their full subtrees.

Anchor format: the heading path, e.g. `2. Scope > 2.1 Out of Scope` or `Clause 4.3`.

Master sections with no matching slave heading become MISSING-candidate chunks (slave_chunk is empty, the whole master section is a strong MISSING hint to flag).

Slave sections with no matching master heading become EXTRA-candidate chunks (master_chunk empty). These go into the "global tail" pseudo-chunk discussed in SKILL.md.

## Strategy B — Master-anchored lexical alignment

For each master section, score every slave passage of similar size by token overlap (Jaccard on lowercased word tokens, ignoring a small English stopword list — see "stoplist" below). Pair the master section with its top-scoring slave passage.

If the top score is below 0.10 Jaccard, treat the master section as orphaned — slave_chunk empty, strong MISSING signal.

If two master sections both choose the same slave passage as their top match, give the slave passage to whichever master section has the higher Jaccard, and re-score the loser against the remaining slave passages.

## Strategy C — Token-window alignment

Split master into windows of ~2000 tokens, breaking on sentence boundaries (do not split mid-sentence — a divergence that straddles a chunk boundary is invisible to both workers seeing the halves).

For each master window, find the slave window of similar length with highest token overlap. Take it.

Anchor format: `master:line 1-N / slave:line P-Q`. Always record the line ranges so the verifier can pin its checks geographically.

## Worker count target

```
master_tokens ≤ 1500    → 1 worker
master_tokens ≤ 4000    → 2 workers
master_tokens ≤ 8000    → 3-4 workers
master_tokens ≤ 16000   → 5-6 workers
master_tokens > 16000   → 7-8 workers (cap)
```

Hard cap at 8 because:
- Parallel dispatch beyond 8 saturates context for the coordinator merging the results.
- Eight workers + eight verifiers is sixteen subagent dispatches per run — beyond that, latency and cost outpace the value of finer granularity.

For master > 32k tokens, do not silently coarsen. Report back: "this document is too large for a single conformance run — recommend splitting by chapter and running once per chapter."

## Global tail handling

Always include a final pseudo-chunk:
- `master_chunk`: empty
- `slave_chunk`: concatenation of any slave passages that no master chunk paired with
- `anchor`: `tail:slave-only`

Workers comparing this chunk are looking exclusively for EXTRA findings — slave content that has no counterpart in master. Most of what's in the tail is legitimate elaboration that should NOT be flagged; flag only items that contradict or quietly extend master scope.

If the tail is large (>3000 tokens), split into multiple tail chunks for separate workers — but mark them all with `anchor: tail:<index>` so the merge step can group them in the report.

## Stoplist for Jaccard scoring

Small English stoplist sufficient for B/C scoring (do not over-engineer — a 30-word list works fine):

```
a an the of in on at to for from by with as is are was were be been being
and or but if then this that these those it its
```

Do not include domain words (SRS, API, system, requirement, etc.) — those often ARE the alignment signal.

## When alignment fails

If after Strategy B/C the average top-match Jaccard is below 0.08 across all chunks, the two documents probably don't share enough vocabulary to be meaningfully comparable as master/slave. Stop and ask the user to confirm the pair is correct.
