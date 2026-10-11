# Upstream `securityfirst/umbrella-content` content bugs

Bugs in the upstream content repo, surfaced by the umbrella-modern import
job. Worth filing PRs upstream at some point. Not blocking the web rebuild.

## YAML parse failures (3 files, content silently dropped)

- `fr/pathways/c_digital-basics.yml`
- `fr/pathways/c_physical-crisis.yml`
- `fr/pathways/c_security-planning.yml`

Error: `unclosed quoted scalar` (js-yaml strict mode; eemeli's `yaml`
parser reports the same). Each file has at least one unclosed double-quoted
string. Likely author/editor bug — possibly introduced by hand-edit of
incomplete sentences or by a partial merge.

**Effect on the import.** These three checklists are skipped during the
French import. Counts after a full import:

| lang | cats | topics | checklists | forms |
|------|------|--------|------------|-------|
| en   |  122 |    534 |         69 |     4 |
| fr   |  122 |    531 |         66 |     4 |

French is short exactly 3 checklists (and ~30 items) relative to English.

**Suggested fix upstream.** Open each file in any YAML editor that surfaces
line/column on parse errors, find the unbalanced quotes near where the
parser fails, and either close them or escape them properly.

**Workaround locally.** None needed — the `yaml` package emits a clear
warning, the import job logs the filename, and the import continues.
