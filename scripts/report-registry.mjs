// Centralized enums and small contracts for the report card and report document.
// Importing these constants ensures validators, loaders, and content schemas
// agree on the same allowed values.

export const RECOMMENDATIONS = ['strong-buy', 'buy', 'track', 'research-more', 'avoid'];
export const CONFIDENCE = ['high', 'medium', 'low'];
export const RISK_RATINGS = ['low', 'moderate', 'significant', 'critical', 'unknown'];
export const VALUATION_STANCES = ['attractive', 'fair', 'stretched', 'expensive', 'unknown'];

// Full-report chapter blocks.
export const BLOCK_TYPES = ['paragraph', 'callout', 'table', 'figure', 'list', 'equation'];

// Allowed callout flavours inside a chapter or appendix block.
export const CALLOUT_TYPES = [
  'investment-recommendation',
  'key-insight',
  'opportunity',
  'risk-alert',
  'final-recommendation',
];

export const CARD_ENUM_FIELDS = {
  recommendation: RECOMMENDATIONS,
  confidence: CONFIDENCE,
  riskRating: RISK_RATINGS,
  valuationStance: VALUATION_STANCES,
};
