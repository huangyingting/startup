# YAML syntax rules

- Use 2-space indentation.
- Prefer block mappings over flow style for nested structures.
- Quote strings containing `: `, `#`, `{`, `}`, `[`, `]`, or leading special characters.
- Use YAML literal blocks (`|`) for multi-line prose, Mermaid diagrams, or long notes.
- Use `null` for unknown optional values, not empty strings.
- Keep arrays homogeneous where possible.
- Preserve source IDs, URLs, dates, numbers, and units exactly across translations.
