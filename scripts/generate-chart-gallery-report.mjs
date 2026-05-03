#!/usr/bin/env node
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { reportsDir, writeYaml } from './text-utils.mjs';

const runId = '20260503000000-chart-gallery-labs';
const reportDir = join(reportsDir, runId);
const schemaVersion = 'startup-diligence-report-v2';
const runDate = '2026-05-03';
const slug = 'chart-gallery-labs';
const company = {
  name: 'Chart Gallery Labs',
  website: 'https://example.com/chart-gallery-labs',
  sector: 'Synthetic chart QA / visualization testing',
  stage: 'Synthetic internal test report',
  foundedYear: 2026,
  headquarters: 'Synthetic City',
  shortDescription: 'Synthetic startup used to validate every native report chart renderer with fictional data.',
};
const zhCompany = {
  ...company,
  sector: '合成图表质量验证',
  stage: '内部测试报告',
  headquarters: '虚构城市',
  shortDescription: '用于验证所有原生报告图表渲染器的虚构公司。',
};

const chapters = [
  ['01-company-snapshot.yaml', 'company-snapshot', 1, 'Company snapshot', '公司概览'],
  ['02-market-macro.yaml', 'market-macro', 2, 'Market and macro', '市场与宏观'],
  ['03-competitive-benchmarking.yaml', 'competitive-benchmarking', 3, 'Competitive benchmarking', '竞争基准'],
  ['04-financial-unit-economics.yaml', 'financial-unit-economics', 4, 'Financial and unit economics', '财务与单位经济'],
  ['05-product-technology.yaml', 'product-technology', 5, 'Product and technology', '产品与技术'],
  ['06-customer-retention.yaml', 'customer-retention', 6, 'Customer and retention', '客户与留存'],
  ['07-risk-regulatory.yaml', 'risk-regulatory', 7, 'Risk and regulatory', '风险与监管'],
  ['08-investment-valuation.yaml', 'investment-valuation', 8, 'Investment and valuation', '投资与估值'],
];

const claimRefs = ['C001'];
const tones = ['positive', 'neutral', 'opportunity', 'risk', 'medium', 'high'];

function head(artifact, extra = {}) {
  return { schemaVersion, artifact, slug, runDate, company, ...extra };
}
function zhHead(doc) {
  return { ...doc, company: zhCompany };
}
function table(id, title, chapterNo, variant = 0) {
  return {
    id,
    title,
    columns: ['Dimension', 'Synthetic input', 'Synthetic reading', 'QA purpose'],
    rows: Array.from({ length: 5 }, (_, i) => [
      `Metric ${chapterNo}.${variant}.${i + 1}`,
      `${(chapterNo * 10 + variant * 3 + i + 1).toFixed(0)} units`,
      ['Strong', 'Mixed', 'Watch', 'Improving', 'Open'][i],
      `Stress renderer table row ${i + 1}`,
    ]),
    notes: 'Synthetic table for visual QA only.',
    claimRefs,
  };
}
function zhTable(t) {
  return {
    ...t,
    title: `图表测试表 ${t.id}`,
    columns: ['维度', '合成输入', '合成解读', '验证目的'],
    rows: t.rows.map((row, i) => [`指标 ${i + 1}`, String(row[1]).replace('units', '单位'), ['强', '混合', '观察', '改善', '待补充'][i] ?? '观察', `验证表格第 ${i + 1} 行`]),
    notes: '仅用于合成视觉验证。',
  };
}
function section(chapterNo, index, title) {
  return {
    number: `${chapterNo}.${index}`,
    title,
    body: `Synthetic diligence section ${chapterNo}.${index} uses fictional data to test rendering density, wrapping, colors, references, and report assembly behavior across the website.`,
    claimRefs,
  };
}
function zhSection(chapterNo, index, title) {
  return {
    number: `${chapterNo}.${index}`,
    title,
    body: `合成尽调小节 ${chapterNo}.${index} 使用虚构数据验证渲染密度、换行、颜色、引用和报告装配表现。`,
    claimRefs,
  };
}
function figBase(id, title, type, layout, summary, data) {
  return { id, title, type, layout, summary, data, approximationNotes: 'Synthetic fictional data for chart visual QA; not investment evidence.', claimRefs };
}
function node(id, label, detail, tone = 'neutral') {
  return { id, label, detail, tone };
}

const figures = [
  figBase('F101', 'Synthetic identity flow', 'flow', 'wide', 'Tests vertical rail flow with several edges and mixed tones.', {
    nodes: [node('n1', 'Origin hypothesis', 'Fictional founding thesis and identity anchor.', 'positive'), node('n2', 'Operating model', 'Synthetic recurring workflow used for layout testing.', 'neutral'), node('n3', 'Expansion loop', 'Mock expansion motion across customer groups.', 'opportunity'), node('n4', 'Constraint check', 'Deliberate risk node to test red styling.', 'risk')],
    edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n4' }],
  }),
  figBase('F102', 'Synthetic milestone timeline', 'timeline', 'wide', 'Tests milestone rows with at least eight entries.', {
    items: Array.from({ length: 10 }, (_, i) => ({ date: `202${i < 4 ? i : 4}-Q${(i % 4) + 1}`, label: `Synthetic milestone ${i + 1}`, detail: `Fictional milestone detail ${i + 1} for timeline wrapping and spacing.`, tone: tones[i % tones.length] })),
  }),
  figBase('F103', 'Synthetic decision map', 'decision-map', 'wide', 'Tests generic graph card placement for decision maps.', {
    nodes: [node('d1', 'Enter market', 'Synthetic go/no-go trigger.', 'positive'), node('d2', 'Delay launch', 'Synthetic dependency delay.', 'medium'), node('d3', 'Partner first', 'Mock channel path.', 'opportunity'), node('d4', 'Avoid segment', 'Risk filter branch.', 'risk'), node('d5', 'Pilot cohort', 'Decision leaf.', 'neutral')],
    edges: [{ from: 'd1', to: 'd3', label: 'if channels open' }, { from: 'd1', to: 'd2', label: 'if capacity tight' }, { from: 'd2', to: 'd4' }, { from: 'd3', to: 'd5' }],
  }),
  figBase('F104', 'Synthetic evidence map', 'evidence-map', 'wide', 'Tests source-to-claim map with optional edges.', {
    nodes: [node('s1', 'Official mock source', 'Company-claimed statement.', 'neutral'), node('s2', 'Independent mock source', 'Synthetic corroboration.', 'positive'), node('c1', 'Claim cluster', 'Aggregated fictional claim.', 'opportunity'), node('g1', 'Evidence gap', 'Known missing input.', 'risk')],
    edges: [{ from: 's1', to: 'c1' }, { from: 's2', to: 'c1' }, { from: 'g1', to: 'c1', label: 'qualifies' }],
  }),
  figBase('F105', 'Synthetic scenario tree', 'scenario-tree', 'wide', 'Tests graph layout for bull/base/bear scenario paths.', {
    nodes: [node('base', 'Base path', 'Moderate adoption case.', 'neutral'), node('bull', 'Bull path', 'Accelerated distribution case.', 'positive'), node('bear', 'Bear path', 'Demand stalls case.', 'risk'), node('fund', 'Funding gate', 'Synthetic financing node.', 'opportunity'), node('exit', 'Exit option', 'Mock liquidity outcome.', 'medium')],
    edges: [{ from: 'base', to: 'fund' }, { from: 'bull', to: 'fund' }, { from: 'bear', to: 'exit' }, { from: 'fund', to: 'exit' }],
  }),
  figBase('F106', 'Synthetic dependency map', 'dependency-map', 'wide', 'Tests graph layout for dependencies and chokepoints.', {
    nodes: [node('cloud', 'Cloud capacity', 'Synthetic infrastructure dependency.', 'high'), node('data', 'Data supply', 'Mock data access path.', 'medium'), node('model', 'Model layer', 'Internal product dependency.', 'neutral'), node('buyer', 'Enterprise buyer', 'External purchasing dependency.', 'opportunity')],
    edges: [{ from: 'cloud', to: 'model' }, { from: 'data', to: 'model' }, { from: 'model', to: 'buyer' }],
  }),
  figBase('F107', 'Synthetic quadrant', 'quadrant', 'wide', 'Tests 0-100 quadrant scale and point legend.', {
    xAxis: 'Distribution reach', yAxis: 'Workflow depth',
    points: [{ label: 'Gallery Labs', x: 78, y: 66, tone: 'positive', detail: 'Synthetic focus company.' }, { label: 'Legacy Suite', x: 52, y: 40, tone: 'neutral' }, { label: 'Niche Bot', x: 28, y: 72, tone: 'opportunity' }, { label: 'Risky Tool', x: 34, y: 24, tone: 'risk' }, { label: 'Platform X', x: 88, y: 44, tone: 'medium' }],
  }),
  figBase('F108', 'Synthetic positioning map', 'positioning-map', 'wide', 'Tests positioning scale and collision handling.', {
    xAxis: 'Ecosystem leverage', yAxis: 'Vertical specificity',
    points: [{ label: 'Broad Platform', x: 8.5, y: 4.8, tone: 'positive' }, { label: 'Vertical Specialist', x: 4.3, y: 8.1, tone: 'opportunity' }, { label: 'Workflow Incumbent', x: 6.4, y: 5.7, tone: 'neutral' }, { label: 'Point Tool', x: 2.2, y: 3.5, tone: 'risk' }, { label: 'Automation Cloud', x: 7.1, y: 6.8, tone: 'medium' }],
  }),
  figBase('F109', 'Synthetic bars', 'bars', 'wide', 'Tests horizontal bar labels and value placement.', {
    items: ['Revenue', 'Pipeline', 'Usage', 'Retention', 'Expansion', 'Support'].map((label, i) => ({ label, value: [42, 75, 63, 88, 54, 31][i], displayValue: `${[42, 75, 63, 88, 54, 31][i]} pts`, tone: tones[i % tones.length] })),
  }),
  figBase('F110', 'Synthetic funnel', 'funnel', 'wide', 'Tests funnel stage widths and label contrast.', {
    items: [{ label: 'Visitors', value: 1000, displayValue: '1,000' }, { label: 'Trials', value: 620, displayValue: '620' }, { label: 'Qualified', value: 410, displayValue: '410' }, { label: 'Pilots', value: 230, displayValue: '230' }, { label: 'Customers', value: 120, displayValue: '120' }],
  }),
  figBase('F111', 'Synthetic waterfall', 'waterfall', 'wide', 'Tests positive and negative bridge values.', {
    items: [{ label: 'Opening ARR', value: 20, displayValue: '+20' }, { label: 'Expansion', value: 12, displayValue: '+12', tone: 'positive' }, { label: 'Churn', value: -4, displayValue: '-4', tone: 'risk' }, { label: 'Price lift', value: 6, displayValue: '+6', tone: 'opportunity' }, { label: 'Ending ARR', value: 34, displayValue: '+34' }],
  }),
  figBase('F112', 'Synthetic range', 'range', 'wide', 'Tests low/mid/high bars for scenario ranges.', {
    items: [{ label: 'Bear case', low: 18, mid: 24, high: 32, displayValue: '18–32' }, { label: 'Base case', low: 40, mid: 55, high: 70, displayValue: '40–70' }, { label: 'Bull case', low: 78, mid: 96, high: 125, displayValue: '78–125' }, { label: 'Stress case', low: 8, mid: 15, high: 22, displayValue: '8–22', tone: 'risk' }],
  }),
  figBase('F113', 'Synthetic sensitivity', 'sensitivity', 'wide', 'Tests scenario bars sourced from series points.', {
    series: [{ label: 'Multiple sensitivity', points: [{ label: '12x revenue', value: 360, displayValue: '$360M' }, { label: '16x revenue', value: 480, displayValue: '$480M' }, { label: '20x revenue', value: 600, displayValue: '$600M' }, { label: '24x revenue', value: 720, displayValue: '$720M' }] }],
  }),
  figBase('F114', 'Synthetic heatmap', 'heatmap', 'wide', 'Tests risk heatmap colors and wrapped cell labels.', {
    columns: ['Likelihood', 'Impact', 'Detection', 'Mitigation'],
    rows: ['Security', 'Regulatory', 'Concentration', 'Reliability'].map((label, r) => ({ label, values: ['low', 'medium', 'high', 'critical'].map((tone, c) => ({ label: `${tone} ${r + 1}.${c + 1}`, tone, detail: `Synthetic heatmap detail ${r + 1}.${c + 1}` })) })),
  }),
  figBase('F115', 'Synthetic matrix', 'matrix', 'wide', 'Tests matrix rows and columns.', {
    columns: ['Product fit', 'Sales motion', 'Data moat', 'Switching cost'],
    rows: ['Segment A', 'Segment B', 'Segment C', 'Segment D'].map((label, r) => ({ label, values: ['positive', 'neutral', 'opportunity', 'risk'].map((tone, c) => ({ label: `cell ${r + 1}.${c + 1}`, tone })) })),
  }),
  figBase('F116', 'Synthetic cohort', 'cohort', 'wide', 'Tests numeric cohort gradient rendering.', {
    columns: ['M1', 'M2', 'M3', 'M6', 'M12'],
    rows: ['Jan cohort', 'Feb cohort', 'Mar cohort', 'Apr cohort'].map((label, r) => ({ label, values: [92, 84, 76, 68, 57].map((v, c) => ({ value: v - r * 4 - c, label: `${v - r * 4 - c}%`, displayValue: `${v - r * 4 - c}%` })) })),
  }),
  figBase('F117', 'Synthetic stack', 'stack', 'wide', 'Tests layered stack architecture cards.', {
    layers: ['Experience layer', 'Workflow layer', 'Model layer', 'Data layer', 'Governance layer'].map((label, i) => ({ label, detail: `Synthetic layer ${i + 1} validates stack spacing and module text.`, tone: tones[i % tones.length], modules: [`Module ${i + 1}A`, `Module ${i + 1}B`], outputs: [`Output ${i + 1}`] })),
  }),
  figBase('F118', 'Synthetic layered lens', 'layered-lens', 'wide', 'Tests narrowing market lens layers.', {
    nodes: [node('tam', 'TAM envelope', 'Largest fictional demand pool.', 'neutral'), node('sam', 'SAM filter', 'Reachable synthetic segment.', 'opportunity'), node('som', 'SOM wedge', 'Near-term served footprint.', 'positive'), node('gap', 'Evidence gap', 'Unsupported private metric.', 'risk')],
  }),
  figBase('F119', 'Synthetic bridge', 'bridge', 'wide', 'Tests bridge flow from public anchor to underwriting output.', {
    nodes: [node('anchor', 'Public anchor', 'Fictional published metric.', 'positive'), node('bridge1', 'Margin bridge', 'Synthetic private input.', 'medium'), node('bridge2', 'Retention bridge', 'Mock cohort proof.', 'opportunity'), node('output', 'Underwriting output', 'Final synthetic decision input.', 'neutral')],
  }),
  figBase('F120', 'Synthetic journey map', 'journey-map', 'wide', 'Tests alternating journey cards along a path.', {
    nodes: [node('entry', 'Discovery', 'Mock acquisition surface.', 'neutral'), node('trial', 'Trial', 'Synthetic activation step.', 'opportunity'), node('adopt', 'Adoption', 'Workflow adoption moment.', 'positive'), node('expand', 'Expansion', 'Cross-sell loop.', 'positive'), node('renew', 'Renewal', 'Retention moment.', 'medium')],
  }),
  figBase('F121', 'Synthetic logic chain', 'logic-chain', 'wide', 'Tests recommendation logic rail and mobile compacting.', {
    nodes: [node('proof', 'Demand proof', 'Synthetic demand signal validates positive styling.', 'positive'), node('platform', 'Platform breadth', 'Mock product breadth creates upside.', 'opportunity'), node('risk', 'Execution risk', 'Fictional risk signal tests constraint styling.', 'risk'), node('gap', 'Missing bridges', 'Private metrics remain intentionally synthetic.', 'high'), node('decision', 'Recommendation', 'Track the synthetic company for renderer QA.', 'neutral')],
  }),
  figBase('F122', 'Synthetic causal map', 'causal-map', 'wide', 'Tests three-column risk transmission mapping.', {
    nodes: [node('cause1', 'Input volatility', 'Synthetic source risk.', 'risk'), node('cause2', 'Partner dependency', 'Mock dependency risk.', 'high'), node('transmit', 'Margin pressure', 'Transmission mechanism.', 'medium'), node('impact1', 'Valuation discount', 'Underwriting impact.', 'risk'), node('impact2', 'Longer sales cycle', 'Operating impact.', 'neutral')],
    edges: [{ from: 'cause1', to: 'transmit' }, { from: 'cause2', to: 'transmit' }, { from: 'transmit', to: 'impact1' }, { from: 'transmit', to: 'impact2' }],
  }),
  figBase('F123', 'Synthetic scatter', 'scatter', 'wide', 'Tests scatter coordinates and point tooltip policy.', {
    xAxis: 'Growth', yAxis: 'Efficiency',
    points: Array.from({ length: 12 }, (_, i) => ({ label: `Peer ${i + 1}`, x: 10 + i * 7, y: 30 + ((i * 13) % 55), tone: tones[i % tones.length], detail: `Synthetic peer ${i + 1}` })),
  }),
  figBase('F124', 'Synthetic scorecard', 'scorecard', 'wide', 'Tests scorecard cards with values and detail text.', {
    items: ['Market', 'Product', 'Moat', 'Retention', 'Risk', 'Valuation'].map((label, i) => ({ label, value: [8, 7, 6, 7, 4, 5][i], displayValue: `${[8, 7, 6, 7, 4, 5][i]} / 10`, detail: `Synthetic score rationale ${i + 1}.`, tone: tones[i % tones.length] })),
  }),
  figBase('F125', 'Synthetic fallback figure', 'other', 'standard', 'Tests fallback rendering for unsupported-but-declared semantic content.', {}, ),
];

const figureByStage = [figures.slice(0, 4), figures.slice(4, 7), figures.slice(7, 10), figures.slice(10, 13), figures.slice(13, 16), figures.slice(16, 19), figures.slice(19, 22), figures.slice(22, 25)];

function zhFigure(fig) {
  const clone = structuredClone(fig);
  clone.title = `合成${fig.type}图 ${fig.id}`;
  clone.summary = `用于验证 ${fig.type} 图表的中文渲染效果。`;
  clone.approximationNotes = '仅为合成测试数据，不代表投资事实。';
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === 'string' && ['label', 'detail', 'displayValue', 'xAxis', 'yAxis'].includes(key)) value[key] = key === 'displayValue' ? child : `中文${key}${Math.abs(child.length % 99)}`;
      else visit(child);
    }
  };
  visit(clone.data);
  return clone;
}

function buildAnalysis(file, artifact, chapterNo, title, zhTitle, stageFigures) {
  const tableStart = (chapterNo - 1) * 4 + 1;
  const tables = Array.from({ length: 4 }, (_, i) => table(`T${String(100 + tableStart + i).padStart(3, '0')}`, `${title} synthetic table ${i + 1}`, chapterNo, i + 1));
  const sections = Array.from({ length: chapterNo === 1 ? 5 : 4 }, (_, i) => section(chapterNo, i + 1, `${title} QA section ${i + 1}`));
  const doc = {
    ...head(artifact, { chapter: { number: chapterNo, title } }),
    sections,
    tables,
    figures: stageFigures,
    evidenceGaps: [{ gap: 'Synthetic report intentionally uses fictional data.', diligencePath: 'Use this report only for renderer and layout QA.', claimRefs }],
    localEvidence: { sources: [], claims: [] },
  };
  const zh = zhHead({
    ...doc,
    chapter: { number: chapterNo, title: zhTitle },
    sections: sections.map((_, i) => zhSection(chapterNo, i + 1, `${zhTitle}测试小节${i + 1}`)),
    tables: tables.map(zhTable),
    figures: stageFigures.map(zhFigure),
    evidenceGaps: [{ gap: '该报告故意使用虚构数据。', diligencePath: '仅用于渲染器和版式验证。', claimRefs }],
  });
  return [doc, zh];
}

function makeSources() {
  return Array.from({ length: 18 }, (_, i) => ({
    id: `S${String(i + 1).padStart(3, '0')}`,
    publisher: `Synthetic Publisher ${i + 1}`,
    title: `Synthetic QA source ${i + 1}`,
    author: null,
    url: `https://example.com/chart-gallery/source-${i + 1}`,
    date: runDate,
    accessDate: runDate,
    sourceType: i % 3 === 0 ? 'official' : i % 3 === 1 ? 'analyst-market-data' : 'other',
    reputationTier: 'low',
    independence: i % 3 === 1 ? 'independent' : 'company',
    keyQuote: `Fictional quote ${i + 1} used only for chart QA.`,
    topics: ['other'],
  }));
}
function makeClaims() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: `C${String(i + 1).padStart(3, '0')}`,
    statement: `Synthetic claim ${i + 1} supports visual QA coverage only.`,
    claimType: 'observed',
    topic: 'other',
    sourceRefs: [`S${String((i % 18) + 1).padStart(3, '0')}`],
    confidence: i % 5 === 0 ? 'medium' : 'high',
    freshness: 'current',
    corroboration: 'single-source',
    notes: 'Synthetic visual QA claim; not investment evidence.',
  }));
}

function makeLedger() {
  const sources = makeSources();
  const claims = makeClaims();
  return head('evidence-ledger', {
    coverage: { sourcesConsidered: sources.length, sourcesRetained: sources.length, claimsCreated: claims.length },
    sources,
    claims,
  });
}

function makeReportDocument(analysisDocs) {
  const allTables = analysisDocs.flatMap((doc) => doc.tables);
  const allFigures = analysisDocs.flatMap((doc) => doc.figures);
  let tableIndex = 0;
  let figureIndex = 0;
  const reportChapters = [
    {
      number: 1,
      title: 'Executive summary',
      sections: [{
        number: '1.1',
        title: 'Synthetic chart gallery purpose',
        blocks: [{ type: 'callout', title: 'Renderer QA only', body: 'This report is fictional and exists to exercise every native figure renderer.', calloutType: 'key-insight', claimRefs }],
      }],
    },
    ...analysisDocs.map((doc, idx) => ({
      number: idx + 2,
      title: doc.chapter.title,
      sections: doc.sections.map((section) => {
        const blocks = [{ type: 'paragraph', body: section.body, claimRefs }];
        if (tableIndex < allTables.length) blocks.push({ type: 'table', tableRef: allTables[tableIndex++].id, claimRefs });
        if (figureIndex < allFigures.length) blocks.push({ type: 'figure', figureRef: allFigures[figureIndex++].id, claimRefs });
        if (figureIndex < allFigures.length && section.number.endsWith('.1')) blocks.push({ type: 'figure', figureRef: allFigures[figureIndex++].id, claimRefs });
        return { number: String(idx + 2) + section.number.slice(1), title: section.title, blocks };
      }),
    })),
  ];
  return head('report-document', {
    reportMeta: { title: 'Chart Gallery Labs Synthetic Chart QA Report', preparedBy: 'GitHub Copilot', contact: null, generatedUsing: schemaVersion, recommendation: 'track', confidence: 'high', riskRating: 'unknown', valuationStance: 'unknown', coverageNotes: 'Synthetic chart gallery retains all generated tables and figures for renderer QA.' },
    coverMetrics: [
      { label: 'Chart types covered', value: String(figures.length), numericValue: figures.length, unit: 'figures', claimRefs },
      { label: 'Synthetic tables', value: String(allTables.length), numericValue: allTables.length, unit: 'tables', claimRefs },
      { label: 'Validation purpose', value: 'Renderer QA', numericValue: null, unit: null, claimRefs },
    ],
    startupIntroduction: { summary: 'Chart Gallery Labs is a fictional entity created to validate every native figure type, dense table rendering, localization parity, and responsive chart behavior.', foundedYear: 2026, founders: [{ name: 'Synthetic Founder', role: 'QA persona', background: 'Fictional founder used only for visual testing.', claimRefs }], foundingLocation: 'Synthetic City', headquarters: 'Synthetic City', website: company.website, productSummary: 'Synthetic chart renderer gallery.', customerFocus: 'Design and QA reviewers.', businessModel: 'No business model; fictional report.', stage: company.stage, fundingStatus: 'No funding; fictional.', claimRefs },
    chapters: reportChapters,
    tables: allTables,
    figures: allFigures,
    appendices: [{ id: 'A', title: 'Synthetic-use disclaimer', blocks: [{ type: 'paragraph', body: 'All data in this report is fictional and should not be used for investment decisions.', claimRefs }] }],
    disclaimer: 'Synthetic report for chart visual QA only.',
  });
}
function makeZhReportDocument(report) {
  const zh = structuredClone(report);
  zh.company = zhCompany;
  zh.reportMeta.title = 'Chart Gallery Labs 合成图表测试报告';
  zh.reportMeta.coverageNotes = '合成图表测试保留所有表格和图表，用于渲染验证。';
  zh.coverMetrics = [
    { label: '覆盖图表类型', value: String(figures.length), numericValue: figures.length, unit: '图表', claimRefs },
    { label: '合成表格', value: String(report.tables.length), numericValue: report.tables.length, unit: '表格', claimRefs },
    { label: '验证目的', value: '渲染验证', numericValue: null, unit: null, claimRefs },
  ];
  zh.startupIntroduction = { ...zh.startupIntroduction, summary: 'Chart Gallery Labs 是一个虚构主体，用于验证所有原生图表类型、密集表格、本地化一致性和响应式图表行为。', founders: [{ name: 'Synthetic Founder', role: '测试角色', background: '仅用于视觉测试的虚构创始人。', claimRefs }], foundingLocation: '虚构城市', headquarters: '虚构城市', productSummary: '合成图表渲染器图库。', customerFocus: '设计和质量验证人员。', businessModel: '无商业模式，仅为虚构报告。', stage: '内部测试报告', fundingStatus: '无融资，仅为虚构。' };
  zh.chapters = report.chapters.map((chapter, ci) => ({ ...chapter, title: ci === 0 ? '执行摘要' : `图表测试章节 ${ci + 1}`, sections: chapter.sections.map((section, si) => ({ ...section, title: `测试小节 ${ci + 1}.${si + 1}`, blocks: section.blocks.map((block) => ({ ...block, title: block.title ? '渲染验证' : undefined, body: block.body ? '本段使用虚构数据验证图表、表格和响应式版式。' : block.body })) })) }));
  zh.tables = report.tables.map(zhTable);
  zh.figures = report.figures.map(zhFigure);
  zh.appendices = [{ id: 'A', title: '合成使用说明', blocks: [{ type: 'paragraph', body: '本报告所有数据均为虚构，不应用于投资判断。', claimRefs }] }];
  zh.disclaimer = '仅用于图表视觉验证的合成报告。';
  return zh;
}

function makeCard(report) {
  return head('report-card', {
    company,
    title: 'Chart Gallery Labs Synthetic Chart QA Report',
    subtitle: 'Fictional data report for native chart renderer validation',
    headline: 'Synthetic report covering every formal native chart type with dense fictional data for visual QA.',
    recommendation: 'track',
    confidence: 'high',
    riskRating: 'unknown',
    valuationStance: 'unknown',
    overallScore: 5,
    sourceStats: { sourcesRetained: 18, claimsReviewed: 40 },
    figureCount: report.figures.length,
    tableCount: report.tables.length,
    keyMetrics: { valuationUsdM: 0, revenueRunRateUsdM: 0, arrUsdM: null, revenueGrowthYoYPct: null, grossMarginPct: null, nrrPct: null, totalRaisedUsdM: null, customerCount: null, headcount: null },
    topStrengths: ['Covers every formal chart type.', 'Includes dense synthetic data for responsive QA.', 'Includes English and Simplified Chinese artifacts.'],
    topRisks: ['All data is fictional.', 'This report should not be used for investment analysis.', 'Renderer behavior may differ as components evolve.'],
    unresolvedGaps: ['No factual diligence was performed because this is a chart gallery report.'],
    reportFiles: { reportDocument: '101-report-document.yaml', reportCard: '102-report-card.yaml' },
  });
}
function makeZhCard(card) {
  return { ...card, company: zhCompany, title: 'Chart Gallery Labs 合成图表测试报告', subtitle: '用于原生图表渲染验证的虚构数据报告', headline: '该合成报告覆盖所有正式原生图表类型，并提供密集虚构数据用于视觉验证。', topStrengths: ['覆盖所有正式图表类型。', '包含密集合成数据用于响应式验证。', '包含英文和简体中文文件。'], topRisks: ['所有数据均为虚构。', '该报告不应用于投资分析。', '组件变化后渲染表现可能改变。'], unresolvedGaps: ['由于这是图表图库报告，未执行事实尽调。'] };
}

rmSync(reportDir, { recursive: true, force: true });
mkdirSync(reportDir, { recursive: true });
const analysisDocs = [];
for (const [index, [file, artifact, chapterNo, title, zhTitle]] of chapters.entries()) {
  const [doc, zh] = buildAnalysis(file, artifact, chapterNo, title, zhTitle, figureByStage[index]);
  analysisDocs.push(doc);
  writeYaml(join(reportDir, file), doc);
  writeYaml(join(reportDir, file.replace('.yaml', '.zh.yaml')), zh);
}
const ledger = makeLedger();
const report = makeReportDocument(analysisDocs);
const zhReport = makeZhReportDocument(report);
const card = makeCard(report);
const zhCard = makeZhCard(card);
writeYaml(join(reportDir, '100-evidence-ledger.yaml'), ledger);
writeYaml(join(reportDir, '101-report-document.yaml'), report);
writeYaml(join(reportDir, '101-report-document.zh.yaml'), zhReport);
writeYaml(join(reportDir, '102-report-card.yaml'), card);
writeYaml(join(reportDir, '102-report-card.zh.yaml'), zhCard);
console.log(`[generate-chart-gallery-report] Wrote ${reportDir}`);
console.log(`[generate-chart-gallery-report] Figures: ${report.figures.length}; tables: ${report.tables.length}`);
