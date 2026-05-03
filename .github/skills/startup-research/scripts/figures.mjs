export const FIGURE_TYPES = [
  'timeline',
  'flow',
  'decision-map',
  'evidence-map',
  'quadrant',
  'positioning-map',
  'bars',
  'waterfall',
  'heatmap',
  'matrix',
  'stack',
  'layered-lens',
  'bridge',
  'journey-map',
  'logic-chain',
  'causal-map',
  'sensitivity',
  'scatter',
  'funnel',
  'cohort',
  'range',
  'scorecard',
  'scenario-tree',
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
//   heatmap:  [['columns'], ['rows']]  -> requires data.columns and data.rows
export const FIGURE_CONTRACTS = {
  timeline: [['items']],
  flow: [['nodes']],
  'decision-map': [['nodes']],
  'evidence-map': [['nodes']],
  'scenario-tree': [['nodes']],
  'dependency-map': [['nodes']],
  quadrant: [['points']],
  'positioning-map': [['points']],
  bars: [['items', 'series']],
  funnel: [['items', 'series']],
  waterfall: [['items']],
  range: [['items']],
  heatmap: [['columns'], ['rows']],
  matrix: [['columns'], ['rows']],
  cohort: [['columns'], ['rows']],
  stack: [['layers', 'items']],
  'layered-lens': [['nodes', 'items']],
  bridge: [['nodes', 'items']],
  'journey-map': [['nodes', 'items']],
  'logic-chain': [['nodes']],
  'causal-map': [['nodes']],
  sensitivity: [['series']],
  scatter: [['points', 'series']],
  scorecard: [['items', 'nodes']],
};

export const FIGURE_ALLOWED_POPULATED_FIELDS = {
  timeline: ['items'],
  flow: ['nodes', 'edges'],
  'decision-map': ['nodes', 'edges'],
  'evidence-map': ['nodes', 'edges'],
  'scenario-tree': ['nodes', 'edges'],
  'dependency-map': ['nodes', 'edges'],
  quadrant: ['points'],
  'positioning-map': ['points'],
  scatter: ['points', 'series'],
  bars: ['items', 'series'],
  funnel: ['items', 'series'],
  waterfall: ['items'],
  range: ['items'],
  sensitivity: ['series'],
  heatmap: ['columns', 'rows'],
  matrix: ['columns', 'rows'],
  cohort: ['columns', 'rows'],
  stack: ['layers', 'items'],
  'layered-lens': ['nodes', 'items'],
  bridge: ['nodes', 'items'],
  'journey-map': ['nodes', 'items'],
  'logic-chain': ['nodes'],
  'causal-map': ['nodes', 'edges'],
  scorecard: ['items', 'nodes'],
  other: [],
};

export const RENDERED_FIGURE_TYPES = FIGURE_TYPES.filter((type) => type !== 'other');
