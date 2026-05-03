export const FIGURE_TYPES = [
  'timeline',
  'flow',
  'quadrant',
  'bar',
  'waterfall',
  'matrix',
  'stack',
  'pyramid',
  'journey-map',
  'funnel',
  'cohort',
  'range',
  'kpi',
  'dag',
  'other',
];

export const FIGURE_LAYOUTS = ['compact', 'standard', 'wide'];

export const FIGURE_DATA_FIELDS = ['items', 'nodes', 'edges', 'points', 'columns', 'rows', 'series', 'layers', 'xAxis', 'yAxis'];

export const FIGURE_ARRAY_FIELDS = ['items', 'nodes', 'edges', 'points', 'columns', 'rows', 'series', 'layers'];

// FIGURE_CONTRACTS encodes required `data.*` array fields per figure type.
// Outer array = requirement groups that must all be satisfied.
// Inner array = exactly one populated field from that group is required.
// Examples:
//   timeline: [['items']]              -> requires data.items
//   bar:      [['items', 'series']]    -> requires exactly one of data.items or data.series
//   matrix:   [['columns'], ['rows']]  -> requires data.columns and data.rows
export const FIGURE_CONTRACTS = {
  timeline: [['items']],
  flow: [['nodes']],
  dag: [['nodes'], ['edges']],
  quadrant: [['points']],
  bar: [['items', 'series']],
  funnel: [['items', 'series']],
  waterfall: [['items']],
  range: [['items']],
  matrix: [['columns'], ['rows']],
  cohort: [['columns'], ['rows']],
  stack: [['layers', 'items']],
  pyramid: [['nodes', 'items']],
  'journey-map': [['nodes', 'items']],
  kpi: [['items', 'nodes']],
};

export const FIGURE_ALLOWED_POPULATED_FIELDS = {
  timeline: ['items'],
  flow: ['nodes', 'edges'],
  dag: ['nodes', 'edges'],
  quadrant: ['points'],
  bar: ['items', 'series'],
  funnel: ['items', 'series'],
  waterfall: ['items'],
  range: ['items'],
  matrix: ['columns', 'rows'],
  cohort: ['columns', 'rows'],
  stack: ['layers', 'items'],
  pyramid: ['nodes', 'items'],
  'journey-map': ['nodes', 'items'],
  kpi: ['items', 'nodes'],
  other: [],
};

export const RENDERED_FIGURE_TYPES = FIGURE_TYPES.filter((type) => type !== 'other');
