---
name: explaining-domain-concepts
description: Use when someone asks what a term, table, field, flag, status, or rule means in a codebase or business domain — "what is X", "how does X work", "explain X", "what does X mean here", "I don't get X" — or when onboarding someone to unfamiliar logic, or when a finding only lands if the reader first understands a rule. Applies even when they did not ask for examples or plain language.
---

# Explaining Domain Concepts

## Overview

Asked "what is X", the default output is a **reference document**: schema first, rules stated as prose, no numbers. Accurate, and unreadable to the person who asked.

**An explanation is a correction plus a worked example where the reader's intuition would have failed.**

A reference *states* the rule. An explanation *shows* it being applied and names the moment it surprises you.

**The reader will not ask for this. Default to it.**

## When to Use

"What is X?" / "How does X work?" / "Explain X" — or onboarding someone to a table, flag, item type, status, or convention. Also: before a finding that only makes sense if the reader knows a rule.

**Not for:** someone fluent in the domain who wants the spec; API/syntax lookup; "where is X defined?"; a yes/no question.

## The four moves

### 1. Lead with the correction, not the definition

What does the reader most likely believe that is **wrong**? Say that first, in one line.

- ❌ `cs_btch_dim is the batch dimension table. PK is batch_dim_id...`
- ✅ **A batch is a pile of stock, not a batch number.**

A wrong belief fights every sentence until you kill it. Kill it in line one, then define. If nothing is counter-intuitive, lead with why it exists. Never lead with a primary key.

### 2. Show the rule, never only state it

Every rule gets real numbers on first appearance.

- ❌ "SAL rows are stored negative, RFD positive."
- ✅

  | Event | `trn_typ` | `qty` stored |
  |---|---|---|
  | Sold 5 bottles for 50.00 | `SAL` | **-5** |
  | Customer returns 2 | `RFD` | **+2** |

Then name the surprise: *"So `SUM(qty)` is already the deduction. That is why the formula **adds** it."*

Pick the case where naive intuition fails. Walk it with numbers.

### 3. Vary one thing at a time

A definition is inert until the reader can test it. Baseline row, change **exactly one** field per row, give a verdict.

| Supplier | Store | Batch no | Same batch? |
|---|---|---|---|
| Pfizer | KL01 | A123 | — baseline |
| Pfizer | **KL02** | A123 | **No** — different store |
| **Zuellig** | KL01 | A123 | **No** — different supplier |

Then name the trap: *"That last row is the one people trip on."*

> **Verify the identity against current state before building this table.**
> This table asserts what defines the thing — so a wrong key becomes the most memorable falsehood on the page. Migrations `ALTER` keys; the first `CREATE TABLE` is not the current definition. Grep *every* migration touching the object, not just the one that created it. Same for defaults, nullability, and enums.
> Real failure: an agent read the original `CREATE`, missed a later `ALTER` that added `exp_dt` to the key, and confidently told the reader the opposite of the truth — inside this exact table.

### 4. Land the stake as a consequence

Not "traceability matters". Say what breaks, in money or damage.

- ✅ "That's the difference between paying Pfizer and paying Zuellig."
- ✅ "Wrong stock numbers get noticed. This doesn't."

## Register

- **Business-why before schema.** Why does it exist? What breaks without it? Keys and grain come later, if at all.
- **Name real instances.** Panadol, Pfizer, KL01 — never "Item A", "Supplier X". Placeholders leave nothing to remember.
- **Translate every snippet on the spot.** `ORDER BY exp_dt ASC` → "soonest to expire goes first."
- **Gloss jargon on first use, or cut it.** "grain", "surrogate key", "at-least-once" are reference words.
- Short sentences. Tables for facts, prose for reasoning. Land on their live problem when there is one.

## Honesty

- **Quote the source verbatim when it settles the question** — migration comment, spec line. Verbatim beats paraphrase.
- **Credit a borrowed example.** If the spec already had the worked example, say so. Transcribing it as your own insight hides that the easy case was easy.
- **Mark verified vs inferred.** "I read the code, I did not run it" is load-bearing.
- **An analogy is yours; a fact is theirs.** Never invent a domain fact to make an analogy land.

## Common mistakes

| Mistake | Fix |
|---|---|
| Opens with grain / keys / PK | Open with why it exists |
| "X is stored negative" with no number | Show `-5` |
| "Item A", "Supplier X" | Name something real |
| Definition first, reframe later | Reframe in line one |
| Formula given as pure algebra | Run one case through it |
| Lists four properties, tests none | Vary one thing at a time |
| Key/default read from the first migration | Check every later `ALTER` |
| Waits to be asked for simple words | The ask never comes. Default to it. |
