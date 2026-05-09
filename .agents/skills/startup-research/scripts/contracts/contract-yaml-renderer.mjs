// Render a Zod schema as a compact pseudo-YAML block annotated with the
// `.describe()` text from each field. Used by build-contract-docs.mjs to keep
// references/contracts.md in lock-step with the executable schemas.
//
// Recognized sidecars on schema._def (set by report-artifacts.schema.mjs):
//   _def.__enumValues  -> string[]   show as `a|b|c`
//   _def.__refKind     -> string     show as `S<L>###` etc.
//   _def.__typeLabel   -> string     show as the literal label (e.g. `YYYY-MM-DD`)
//   _def.__renderHide  -> boolean    omit the field from rendered output
//
// Sidecars live on _def (not the schema instance) because Zod's `.describe()`
// returns a new instance that shares the same _def. Properties on the instance
// would be lost the moment a field is annotated with `.describe(...)`.

const INDENT = '  ';

function pad(level) {
  return INDENT.repeat(level);
}

function isZod(schema, ctorName) {
  return schema && schema.constructor && schema.constructor.name === ctorName;
}

function unwrapWrappers(schema) {
  // Strip Default/Preprocess so the renderer sees the inner shape; keep
  // Optional/Nullable as markers because they affect the rendered type label.
  let current = schema;
  let hasDefault = false;
  let defaultValue;
  while (current) {
    if (isZod(current, 'ZodDefault')) {
      hasDefault = true;
      defaultValue = current._def.defaultValue;
      current = current._def.innerType;
      continue;
    }
    if (isZod(current, 'ZodPreprocess')) {
      current = current._def.out;
      continue;
    }
    break;
  }
  return { schema: current, hasDefault, defaultValue };
}

function unwrapOptionality(schema) {
  let current = schema;
  let optional = false;
  let nullable = false;
  while (current) {
    if (isZod(current, 'ZodOptional')) {
      optional = true;
      current = current._def.innerType;
      continue;
    }
    if (isZod(current, 'ZodNullable')) {
      nullable = true;
      current = current._def.innerType;
      continue;
    }
    break;
  }
  return { schema: current, optional, nullable };
}

function describe(schema) {
  return typeof schema?.description === 'string' && schema.description.trim().length > 0
    ? schema.description.trim()
    : null;
}

function appendNullable(label, nullable) {
  return nullable ? `${label}|null` : label;
}

function renderScalarLabel(schema) {
  const stripped = unwrapWrappers(schema);
  const node = stripped.schema;
  const def = node._def || {};
  if (def.__typeLabel) return def.__typeLabel;
  if (Array.isArray(def.__enumValues)) return def.__enumValues.join('|');
  if (def.__refKind) return def.__refKind;
  if (isZod(node, 'ZodLiteral')) {
    const values = def.values || [];
    return values.length === 1 ? JSON.stringify(values[0]) : values.map((v) => JSON.stringify(v)).join('|');
  }
  if (isZod(node, 'ZodEnum')) {
    const entries = def.entries || {};
    return Object.values(entries).join('|');
  }
  if (isZod(node, 'ZodString')) return 'string';
  if (isZod(node, 'ZodNumber')) return 'number';
  if (isZod(node, 'ZodBoolean')) return 'boolean';
  if (isZod(node, 'ZodNull')) return 'null';
  if (isZod(node, 'ZodAny') || isZod(node, 'ZodUnknown')) return 'any';
  if (isZod(node, 'ZodDate')) return 'YYYY-MM-DD';
  if (isZod(node, 'ZodRecord')) return '{...}';
  if (isZod(node, 'ZodUnion')) {
    const parts = (def.options || []).map(renderScalarLabel);
    return [...new Set(parts)].join('|');
  }
  if (isZod(node, 'ZodArray')) {
    return `[${renderScalarLabel(node.element)}]`;
  }
  if (isZod(node, 'ZodObject')) return '{object}';
  return 'unknown';
}

function renderObjectFields(shape, level) {
  const lines = [];
  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (isHidden(fieldSchema)) continue;
    lines.push(...renderField(key, fieldSchema, level));
  }
  return lines;
}

function isHidden(schema) {
  let current = schema;
  while (current) {
    if (current._def?.__renderHide) return true;
    if (isZod(current, 'ZodOptional') || isZod(current, 'ZodNullable') || isZod(current, 'ZodDefault')) {
      current = current._def.innerType;
      continue;
    }
    if (isZod(current, 'ZodPreprocess')) {
      current = current._def.out;
      continue;
    }
    break;
  }
  return false;
}

function renderField(key, fieldSchema, level) {
  const stripped = unwrapWrappers(fieldSchema);
  const opt = unwrapOptionality(stripped.schema);
  const inner = opt.schema;
  const desc = describe(fieldSchema) || describe(stripped.schema) || describe(inner);
  const optMarker = opt.optional ? '?' : '';
  const indent = pad(level);

  // Object → expand on next lines unless it's a record / passthrough-only blob
  if (isZod(inner, 'ZodObject')) {
    const shape = inner.shape || inner._def?.shape || {};
    const fields = Object.entries(shape);
    if (fields.length === 0) {
      return [annotateHeader(`${indent}${key}${optMarker}: {}`, desc, opt.nullable)];
    }
    return [
      annotateHeader(`${indent}${key}${optMarker}:`, desc, opt.nullable),
      ...renderObjectFields(shape, level + 1),
    ];
  }

  // Array of objects → expand element on next lines
  if (isZod(inner, 'ZodArray') && isZod(inner.element, 'ZodObject')) {
    const shape = inner.element.shape || inner.element._def?.shape || {};
    const elementDesc = describe(inner.element);
    const headerDesc = desc || elementDesc;
    const fieldEntries = Object.entries(shape);
    if (fieldEntries.length === 0) {
      return [annotateHeader(`${indent}${key}${optMarker}: [{}]`, headerDesc, opt.nullable)];
    }
    const childLines = renderObjectFields(shape, level + 2);
    if (childLines.length === 0) {
      return [annotateHeader(`${indent}${key}${optMarker}: []`, headerDesc, opt.nullable)];
    }
    // Convert "    firstKey: ..." to "  - firstKey: ..." for the first line
    const first = childLines[0];
    childLines[0] = `${indent}${INDENT}- ${first.slice(indent.length + INDENT.length * 2)}`;
    return [
      annotateHeader(`${indent}${key}${optMarker}:`, headerDesc, opt.nullable),
      ...childLines,
    ];
  }

  // Scalar / array of scalar
  const label = appendNullable(renderScalarLabel(inner), opt.nullable);
  const defaultSuffix = stripped.hasDefault ? ` (default ${formatDefault(stripped.defaultValue)})` : '';
  return [annotateHeader(`${indent}${key}${optMarker}: ${label}${defaultSuffix}`, desc, false)];
}

function annotateHeader(line, desc, nullable) {
  const parts = [];
  if (nullable) parts.push('(nullable)');
  if (desc) parts.push(desc.replace(/\s+/g, ' ').trim());
  if (parts.length === 0) return line;
  return `${line}  # ${parts.join(' ')}`;
}

function formatDefault(value) {
  if (typeof value === 'function') {
    try { return JSON.stringify(value()); } catch { return '...'; }
  }
  return JSON.stringify(value);
}

export function renderSchemaAsYaml(schema, { rootLabel = null } = {}) {
  const stripped = unwrapWrappers(schema);
  const opt = unwrapOptionality(stripped.schema);
  const inner = opt.schema;

  if (isZod(inner, 'ZodObject')) {
    const shape = inner.shape || inner._def?.shape || {};
    const lines = renderObjectFields(shape, 0);
    if (rootLabel) lines.unshift(`# ${rootLabel}`);
    return lines.join('\n');
  }
  if (isZod(inner, 'ZodArray') && isZod(inner.element, 'ZodObject')) {
    const shape = inner.element.shape || inner.element._def?.shape || {};
    const childLines = renderObjectFields(shape, 1);
    if (childLines.length > 0) {
      const first = childLines[0];
      childLines[0] = `- ${first.slice(INDENT.length)}`;
    }
    return childLines.join('\n');
  }
  return renderScalarLabel(inner);
}
