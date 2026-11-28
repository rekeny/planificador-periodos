# Small change form · Security audit item about open questions

- **Date:** 2026-11-26
- **Branch:** `docs/security-question-dialog`
- **Approved by:** Fernando, 2026-11-26 (chat)

## What

One new line in the «Audit of each change» list of `docs/security.md`: «While a question is open nothing else acts, and a question is never a write.»

## Why

The Security role audits each change against that list. The two properties (a question blocks every other action while it is open, and opening one never writes) are what keep the confirmation dialogs from being skipped or from saving something by themselves, and they were not in the list.

## How

- `docs/security.md`: the new item, placed before «Workflows with minimal permissions and pinned versions», after the item about deletions.
- This form.

## Why it is small

It is a documentation line: no code, no behaviour, no dependency, and nothing in `src/domain/`.

## Tests

None: it is a document. `npm run verify` still runs (formatting of the Markdown files) and must stay green.
