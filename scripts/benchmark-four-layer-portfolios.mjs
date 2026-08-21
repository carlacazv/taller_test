import process from "node:process";
import { runCommand, runNpmScript, writeJson, writeText } from "./mutation-harness.mjs";

const outputRoot = "reports/four-layer-tournament";
const rawRoot = `${outputRoot}/raw`;
const warmups = Number.parseInt(process.env.TOURNAMENT_WARMUPS || "1", 10);
const iterations = Number.parseInt(process.env.TOURNAMENT_ITERATIONS || "5", 10);

if (!Number.isInteger(warmups) || warmups < 0) throw new Error("TOURNAMENT_WARMUPS must be a non-negative integer");
if (!Number.isInteger(iterations) || iterations < 1) throw new Error("TOURNAMENT_ITERATIONS must be a positive integer");

const uiSpecs = {
  domain: "tests/browser/experiment/four-layer-domain.spec.js",
  api: "tests/browser/experiment/four-layer-api.spec.js",
  browser: "tests/browser/experiment/four-layer-browser.spec.js"
};

const portfolios = [
  { id: "unit-only", title: "Unit only", pr: 3, layers: ["unit"] },
  { id: "integration-only", title: "Integration only", pr: 4, layers: ["integration"] },
  { id: "e2e-api-only", title: "E2E API only", pr: 5, layers: ["e2e-api"] },
  { id: "e2e-ui-only", title: "E2E UI only", pr: 22, layers: ["e2e-ui"] },
  { id: "unit-integration", title: "Unit + Integration", pr: 6, layers: ["unit", "integration"] },
  { id: "unit-e2e-api", title: "Unit + E2E API", pr: 7, layers: ["unit", "e2e-api"] },
  { id: "unit-e2e-ui", title: "Unit + E2E UI", pr: 23, layers: ["unit", "e2e-ui"] },
  { id: "integration-e2e-api", title: "Integration + E2E API", pr: 8, layers: ["integration", "e2e-api"] },
  { id: "integration-e2e-ui", title: "Integration + E2E UI", pr: 24, layers: ["integration", "e2e-ui"] },
  { id: "e2e-api-e2e-ui", title: "E2E API + E2E UI", pr: 25, layers: ["e2e-api", "e2e-ui"] },
  { id: "unit-integration-e2e-api", title: "Unit + Integration + E2E API", pr: 26, layers: ["unit", "integration", "e2e-api"] },
  { id: "unit-integration-e2e-ui", title: "Unit + Integration + E2E UI", pr: 27, layers: ["unit", "integration", "e2e-ui"] },
  { id: "unit-e2e-api-e2e-ui", title: "Unit + E2E API + E2E UI", pr: 28, layers: ["unit", "e2e-api", "e2e-ui"] },
  { id: "integration-e2e-api-e2e-ui", title: "Integration + E2E API + E2E UI", pr: 29, layers: ["integration", "e2e-api", "e2e-ui"] },
  { id: "all-four", title: "Unit + Integration + E2E API + E2E UI", pr: 30, layers: ["unit", "integration", "e2e-api", "e2e-ui"] }
];

function uiProfile(layers) {
  if (!layers.includes("e2e-ui")) return [];
  const specs = [uiSpecs.browser];
  if (!layers.includes("unit") && !layers.includes("e2e-api")) specs.push(uiSpecs.domain);
  if (!layers.includes("integration") && !layers.includes("e2e-api")) specs.push(uiSpecs.api);
  return specs;
}

function runLayer(layer, portfolio, phase, sequence) {
  const logPath = `${rawRoot}/${phase}/${String(sequence).padStart(3, "0")}-${portfolio.id}-${layer}.log`;
  if (layer === "unit") return runNpmScript("test:unit", { logPath });
  if (layer === "integration") return runNpmScript("test:integration", { logPath });
  if (layer === "e2e-api") return runNpmScript("test:e2e-api", { logPath });
  if (layer === "e2e-ui") {
    return runCommand({
      args: ["run", "test:browser", "--", ...uiProfile(portfolio.layers)],
      env: { MUTATION_EXPERIMENT: "1" },
      logPath
    });
  }
  throw new Error(`Unknown layer ${layer}`);
}

function runPortfolio(portfolio, phase, sequence) {
  const startedAt = process.hrtime.bigint();
  const layerRuns = portfolio.layers.map((layer) => {
    const result = runLayer(layer, portfolio, phase, sequence);
    if (result.exitCode !== 0) {
      throw new Error(`${portfolio.title} failed in ${layer}; evidence: ${result.logPath}`);
    }
    return { layer, durationMs: result.durationMs, logPath: result.logPath };
  });
  return {
    durationMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
    layerRuns
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

let sequence = 0;
for (let warmup = 0; warmup < warmups; warmup += 1) {
  const offset = warmup % portfolios.length;
  const order = [...portfolios.slice(offset), ...portfolios.slice(0, offset)];
  for (const portfolio of order) {
    sequence += 1;
    runPortfolio(portfolio, "warmup", sequence);
  }
}

const observed = new Map(portfolios.map((portfolio) => [portfolio.id, []]));
for (let round = 0; round < iterations; round += 1) {
  const offset = round % portfolios.length;
  const order = [...portfolios.slice(offset), ...portfolios.slice(0, offset)];
  for (const portfolio of order) {
    sequence += 1;
    observed.get(portfolio.id).push({ round: round + 1, ...runPortfolio(portfolio, "measured", sequence) });
  }
}

const results = portfolios.map((portfolio) => {
  const runs = observed.get(portfolio.id);
  const durations = runs.map((run) => run.durationMs);
  return {
    ...portfolio,
    uiSpecs: uiProfile(portfolio.layers),
    medianMs: median(durations),
    p95Ms: percentile(durations, 95),
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
    runs
  };
});

const fastest = Math.min(...results.map((result) => result.medianMs));
for (const result of results) result.relativeCost = result.medianMs / fastest;

const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: "1.0",
  kind: "four-layer-same-run-portfolio-benchmark",
  generatedAt,
  commit: process.env.GITHUB_SHA || "local",
  node: process.version,
  protocol: {
    warmups,
    iterations,
    runner: "same GitHub Actions job",
    ordering: "rotating portfolio order per measured round",
    interpretation: "Use this benchmark for runtime ranking; use per-PR mutation artifacts for detection ranking. Mutation detection remains the primary gate."
  },
  results
};

const markdown = [
  "# Four-layer same-run portfolio benchmark",
  "",
  `- Generated: ${generatedAt}`,
  `- Commit: \`${report.commit}\``,
  `- Protocol: ${warmups} warmup round(s) + ${iterations} measured round(s) for every portfolio on the same runner`,
  "- Portfolio order rotates between measured rounds to reduce temporal-order bias.",
  "- Runtime is a tie-breaker only after mutation-detection equivalence.",
  "",
  "| Portfolio | PR | Layers | UI specs | Median | p95 | Relative cost |",
  "|---|---:|---|---:|---:|---:|---:|",
  ...[...results].sort((a, b) => a.medianMs - b.medianMs).map((result) =>
    `| ${result.title} | #${result.pr} | ${result.layers.join(" + ")} | ${result.uiSpecs.length} | ${result.medianMs.toFixed(2)} ms | ${result.p95Ms.toFixed(2)} ms | ${result.relativeCost.toFixed(2)}x |`
  ),
  ""
].join("\n");

writeJson(`${outputRoot}/portfolio-benchmark.json`, report);
writeText(`${outputRoot}/portfolio-benchmark.md`, markdown);
console.log(markdown);
