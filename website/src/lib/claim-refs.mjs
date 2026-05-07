// Inline claim-ref helpers shared by the website renderer (Astro) and the
// skill validators (`validation-catalog.mjs`). Single source of truth for the
// inline claim-ref pattern and its associated text-splitting helpers; if the
// claim-id format changes, every consumer (renderer + validators) updates
// from this one file.
//
// Inline claim refs appear in section bodies, list items, table cells, and
// callout text as `[CO001]`, `[CM045]`, etc. Capture group 1 of
// `INLINE_CLAIM_REF_PATTERN` is the bare claim id.

// Use a getter-style export to mint a fresh regex per call site — sharing one
// stateful `lastIndex` across `matchAll` consumers in different scopes is
// brittle.
export const INLINE_CLAIM_REF_SOURCE = '\\[(C[A-Z]\\d{3})\\]';

export function inlineClaimRefPattern() {
  return new RegExp(INLINE_CLAIM_REF_SOURCE, 'g');
}

export function hasInlineClaimRefs(value) {
  return new RegExp(INLINE_CLAIM_REF_SOURCE).test(String(value ?? ''));
}

// Strips a trailing run of `[C<L>###]` refs (with surrounding whitespace and
// a final period) so headlines/summaries collapse to clean prose.
export function stripTrailingClaimRefs(value) {
  return String(value ?? '').replace(/(?:\s*\[C[A-Z]\d{3}\])+\.?$/g, '.').trim();
}

// Splits a string into a list of `{ text }` and `{ ref }` parts so the
// renderer can replace each ref with a `<ClaimRefs>` component while keeping
// the surrounding prose intact. Returns a single-element list when the input
// has no inline refs.
export function splitClaimRefsText(value) {
  const text = String(value ?? '');
  const parts = [];
  const pattern = inlineClaimRefPattern();
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > lastIndex) parts.push({ text: text.slice(lastIndex, match.index) });
    parts.push({ ref: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex) });
  return parts.length ? parts : [{ text }];
}
