## Writing register (mandatory)

Write all user-facing text in ASD-STE100 style with the banned-word list below. This applies to
chat replies, commit bodies, PR text, Jira and Teams messages, plan files, reports and memory files.
It does not apply to code, code comments, commands, file paths, JSON, tables of data, or text quoted
from a specification.

A Stop hook (`~/.claude/hooks/writing-gate.cjs`) scans the final reply for em dashes, en dashes and
banned words. A hit blocks the turn. Rewrite the reply and send it again.

### Sentence rules (ASD-STE100)

1. Write one topic per sentence.
2. Write one instruction per sentence.
3. Keep a procedural sentence to 20 words or fewer. Keep a descriptive sentence to 25 words or fewer.
4. Keep a paragraph to 6 sentences or fewer.
5. Use the active voice. Name the actor: "the system", "QA", "the user", "you".
6. Use the present tense unless the sentence is about a past event.
7. Use a simple verb, not an -ing form, where a simple verb exists.
8. Use one word for one meaning. Do not change the word for variety.
9. Use the articles "the" and "a". Do not drop words to make a sentence shorter.
10. Do not put more than 3 nouns in a row.
11. Write numbers as digits.
12. Write steps as a numbered list, one step per line.
13. Put the condition before the instruction: "If X, do Y."
14. Do not use slang, idiom, metaphor or figurative verbs.
15. Do not write in the first person in text that QRRA reads. Write "the implementation".

### How to ask the user a question

1. State the data first, in a numbered list or a table.
2. State the options in a table with one row per option and one column for the result.
3. Ask one question in one sentence.

### Banned words and their replacements

| Banned | Use |
|---|---|
| raise, raises, raised (a row) | insert, inserts, the inserted row |
| draw, draws, drawn (a quantity) | deduct, deducts, deducted |
| the draw (noun) | the deduction |
| carries, carrying | holds, with |
| stands, where it stands, what stands on master | is, in place, what is on master |
| names, naming (a batch or row) | records, recorded on |
| rolls onto, lands on | is deducted from, is applied to |
| the walk, the sweep | the allocation, the update |
| hunting for | searching for |
| grain (of a set of rows) | state the unit: "one row per source sale" |
| flag, flagging (an issue) | ask, state, record |
| posts away | marks the sale settled |
| born pending | created pending |
| spill, spills, spilled | deduct from the next batch |
| the table reads X, the spec reads X | the table states X, the spec states X |
| has no X, holds no X, carries no X, writes nothing | does not have any X, does not hold any X, does not write anything |
| &sect; 3.14 | Section 3.14 |
| em dash, en dash | period, comma, colon |
| we, our (in QRRA-facing text) | the implementation |
| silent, silently, silence | state the action: "does not report", "does not write a log line" |
| leave it silent, stay silent | do not report it, do not write a message |
| quiet, quietly | state the action: "without a message", "does not print" |
| rhythm, cadence | the interval, the order, the schedule |

Keep "read" for code that reads data: "the check reads CS_UPSL". Keep "no" as the natural idiom in
"no longer", "there is no X", and in a specification's own wording.

### Example

Not this: "The walk drew 85 units and the remainder landed on the negative bin, which is where it
trips people up."

This: "The allocation deducted 85 units. The last 17 units were deducted from a batch that was
already negative. This is the defect."
