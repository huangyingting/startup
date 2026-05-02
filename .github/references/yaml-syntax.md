# YAML syntax rules

Shared YAML rules for all report artifacts.

## Document shape

- Write complete files only; never write continuation fragments.
- Every artifact starts at document head with:
  - `schemaVersion`
  - `artifact`
  - `slug`
  - `runDate`
  - `company`
- Do not start with prose such as `Continuing...`, a partial list item, or a mid-file comment.
- If content is large, write the complete file directly to disk instead of returning partial snippets.

## Formatting

- Use 2-space indentation.
- Never use tabs.
- Keep arrays homogeneous.
- Use literal blocks (`|`) for long paragraphs, equations, and disclaimers.
- Use `null` for unknown optional values.
- Quote strings containing:
  - `: `
  - `#`
  - `{` or `}`
  - `[` or `]`
  - leading `*`
  - leading `&`

## Values

- Numeric KPI fields are numbers or `null`, not strings.
- Figure specs are structured YAML objects, not Mermaid, SVG, Markdown, prose, or diagram-language strings.
- Preserve claim IDs, source IDs, figure IDs, table IDs, URLs, dates, enum values, and numeric values exactly across translations.

## Completion check

Before saving any YAML artifact:

- Parse the file.
- Confirm required head keys exist.
- Confirm indentation is spaces-only.
- Confirm unknown values use `null`.
- Confirm numeric fields are numeric or `null`.
- Confirm figure `data` is a structured object.
