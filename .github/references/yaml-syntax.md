# YAML syntax rules

- Use 2-space indentation; never use tabs.
- Write complete files, not continuation fragments. Every YAML artifact must begin at the document head with `schemaVersion`, `artifact`, `slug`, `runDate`, and `company` before section-specific content.
- Never start an artifact with prose such as `Continuing...`, a partial list item, or a mid-file comment. If a file is too large, write it directly to disk in one complete document rather than returning a partial snippet.
- Quote strings containing `: `, `#`, `{`, `}`, `[`, `]`, leading `*`, or leading `&`.
- Use literal blocks (`|`) for long paragraphs, equations, and disclaimers.
- Use `null` for unknown optional values.
- Numeric KPI fields must be numbers or `null`.
- Keep arrays homogeneous.
- Figure specs must be structured YAML objects, not diagram-language strings.
- Preserve claim IDs, source IDs, figure IDs, table IDs, URLs, dates, and numeric values exactly across translations.