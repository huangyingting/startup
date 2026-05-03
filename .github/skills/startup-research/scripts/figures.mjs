export const FIGURE_TYPES = [
  'timeline',
  'flow',
  'quadrant',
  'positioning-map',
  'bars',
  'waterfall',
  'matrix',
  'stack',
  'layered-lens',
  'journey-map',
  'funnel',
  'cohort',
  'range',
  'scorecard',
  'dependency-map',
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
//   bars:     [['items', 'series']]    -> requires exactly one of data.items or data.series
//   matrix:   [['columns'], ['rows']]  -> requires data.columns and data.rows
export const FIGURE_CONTRACTS = {
  timeline: [['items']],
  flow: [['nodes']],
  'dependency-map': [['nodes'], ['edges']],
  quadrant: [['points']],
  'positioning-map': [['points']],
  bars: [['items', 'series']],
  funnel: [['items', 'series']],
  waterfall: [['items']],
  range: [['items']],
  matrix: [['columns'], ['rows']],
  cohort: [['columns'], ['rows']],
  stack: [['layers', 'items']],
  'layered-lens': [['nodes', 'items']],
  'journey-map': [['nodes', 'items']],
  scorecard: [['items', 'nodes']],
};

export const FIGURE_ALLOWED_POPULATED_FIELDS = {
  timeline: ['items'],
  flow: ['nodes', 'edges'],
  'dependency-map': ['nodes', 'edges'],
  quadrant: ['points'],
  'positioning-map': ['points'],
  bars: ['items', 'series'],
  funnel: ['items', 'series'],
  waterfall: ['items'],
  range: ['items'],
  matrix: ['columns', 'rows'],
  cohort: ['columns', 'rows'],
  stack: ['layers', 'items'],
  'layered-lens': ['nodes', 'items'],
  'journey-map': ['nodes', 'items'],
  scorecard: ['items', 'nodes'],
  other: [],
};

export const RENDERED_FIGURE_TYPES = FIGURE_TYPES.filter((type) => type !== 'other');
