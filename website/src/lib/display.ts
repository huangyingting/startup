export function displayLabel(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value !== 'string') return String(value);

  const trimmed = value.trim();
  if (!trimmed) return '';

  // Transform compact identifiers/enums only. Leave prose, URLs, company names,
  // and mixed strings untouched.
  if (/^[a-z][A-Za-z0-9]*$/.test(trimmed) && /[A-Z]/.test(trimmed)) {
    return trimmed
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(trimmed)) return trimmed;

  return trimmed
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
