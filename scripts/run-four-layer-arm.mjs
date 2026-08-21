import { readFileSync } from "node:fs";
import process from "node:process";
import {
  runCommand,
  runNpmScript,
  withMutation,
  writeJson,
  writeText
} from "./mutation-harness.mjs";

const outputRoot = "reports/four-layer-experiment";
const logRoot = `${outputRoot}/raw`;
const armPath = "experiments/four-layer/arm.json";
const warmups = Number.parseInt(process.env.ARM_BENCHMARK_WARMUPS || "1", 10);
const iterations = Number.parseInt(process.env.ARM_BENCHMARK_ITERATIONS || "3", 10);

if (!Number.isInteger(warmups) || warmups < 0) throw new Error("ARM_BENCHMARK_WARMUPS must be a non-negative integer");
if (!Number.isInteger(iterations) || iterations < 1) throw new Error("ARM_BENCHMARK_ITERATIONS must be a positive integer");

const validLayers = ["unit", "integration", "e2e-api", "e2e-ui"];
const arm = JSON.parse(readFileSync(armPath, "utf8"));
if (!arm.id || !Array.isArray(arm.layers) || arm.layers.length === 0) {
  throw new Error(`${armPath} must define a non-empty arm id and layers array`);
}
for (const layer of arm.layers) {
  if (!validLayers.includes(layer)) throw new Error(`Unknown experiment layer: ${layer}`);
}
if (new Set(arm.layers).size !== arm.layers.length) throw new Error("Experiment layers must be unique");

const uiSpecs = {
  domain: "tests/browser/experiment/four-layer-domain.spec.js",
  api: "tests/browser/experiment/four-layer-api.spec.js",
  browser: "tests/browser/experiment/four-layer-browser.spec.js"
};

function uiProfile(layers) {
  if (!layers.includes("e2e-ui")) return [];
  const profile = [uiSpecs.browser];
  if (!layers.includes("unit") && !layers.includes("e2e-api")) profile.push(uiSpecs.domain);
  if (!layers.includes("integration") && !layers.includes("e2e-api")) profile.push(uiSpecs.api);
  return profile;
}

const selectedUiSpecs = uiProfile(arm.layers);

const layerDefinitions = {
  unit: {
    id: "unit",
    label: "Unit",
    command: "npm run test:unit",
    run(logPath) {
      return runNpmScript("test:unit", { logPath });
    }
  },
  integration: {
    id: "integration",
    label: "Integration",
    command: "npm run test:integration",
    run(logPath) {
      return runNpmScript("test:integration", { logPath });
    }
  },
  "e2e-api": {
    id: "e2e-api",
    label: "E2E API",
    command: "npm run test:e2e-api",
    run(logPath) {
      return runNpmScript("test:e2e-api", { logPath });
    }
  },
  "e2e-ui": {
    id: "e2e-ui",
    label: "E2E UI / Playwright",
    command: `npm run test:browser -- ${selectedUiSpecs.join(" ")}`,
    run(logPath) {
      return runCommand({
        args: ["run", "test:browser", "--", ...selectedUiSpecs],
        env: { MUTATION_EXPERIMENT: "1" },
        logPath
      });
    }
  }
};

const selectedLayers = arm.layers.map((id) => layerDefinitions[id]);

const mutants = [
  { id: "M01", category: "domain", description: "Premium unit price drifts from 60 to 61", file: "src/domain/quote.js", from: "  premium: 60", to: "  premium: 61" },
  { id: "M02", category: "domain", description: "Premium discount rate changes from 10% to 20%", file: "src/domain/quote.js", from: "subtotal * 0.1 : 0", to: "subtotal * 0.2 : 0" },
  { id: "M03", category: "domain", description: "Inclusive free-shipping boundary becomes exclusive", file: "src/domain/quote.js", from: "discountedSubtotal >= 80 ? 0 : 8", to: "discountedSubtotal > 80 ? 0 : 8" },
  { id: "M04", category: "domain", description: "Approved shipping fee changes from 8 to 9", file: "src/domain/quote.js", from: "discountedSubtotal >= 80 ? 0 : 8", to: "discountedSubtotal >= 80 ? 0 : 9" },
  { id: "M05", category: "domain", description: "Tax rate changes from 10% to 20%", file: "src/domain/quote.js", from: "const tax = discountedSubtotal * 0.1;", to: "const tax = discountedSubtotal * 0.2;" },
  { id: "M06", category: "domain", description: "Zero quantity is accepted by the backend", file: "src/domain/quote.js", from: "quantity <= 0", to: "quantity < 0" },
  { id: "M07", category: "api", description: "HTTP request mapping increments quantity", file: "src/http/app.js", from: "const quantity = Number(url.searchParams.get(\"quantity\"));", to: "const quantity = Number(url.searchParams.get(\"quantity\")) + 1;" },
  { id: "M08", category: "api", description: "Authorization guard is removed", file: "src/application/quote-service.js", from: "if (role !== \"member\" && role !== \"admin\") {", to: "if (false && role !== \"member\" && role !== \"admin\") {" },
  { id: "M09", category: "api", description: "HTTP layer discards the caller role and treats everyone as guest", file: "src/http/app.js", from: "const role = request.headers[\"x-role\"] || \"guest\";", to: "const role = \"guest\";" },
  { id: "M10", category: "api", description: "Successful HTTP response corrupts the total", file: "src/http/app.js", from: "sendJson(response, 200, { quote });", to: "sendJson(response, 200, { quote: { ...quote, total: quote.total + 1 } });" },
  { id: "M11", category: "browser", description: "Page composition loses the primary heading", file: "src/web/index.html", from: "<h1>TRIMS Quote Lab</h1>", to: "<h2>TRIMS Quote Lab</h2>" },
  { id: "M12", category: "browser", description: "Browser wiring calls the wrong endpoint", file: "src/web/index.html", from: "fetch(`/api/quote?plan=${plan}&quantity=${quantity}`", to: "fetch(`/api/pricing?plan=${plan}&quantity=${quantity}`" },
  { id: "M13", category: "browser", description: "Browser sends a guest role instead of member", file: "src/web/index.html", from: "headers: { \"x-role\": \"member\" }", to: "headers: { \"x-role\": \"guest\" }" },
  { id: "M14", category: "browser", description: "Submit handler is bound to the wrong browser event", file: "src/web/index.html", from: "form.addEventListener(\"submit\", async (event) => {", to: "form.addEventListener(\"change\", async (event) => {" },
  { id: "M15", category: "browser", description: "Plan hydration from the URL is disabled", file: "src/web/index.html", from: "if (query.has(\"plan\")) document.querySelector(\"#plan\").value = query.get(\"plan\");", to: "if (false && query.has(\"plan\")) document.querySelector(\"#plan\").value = query.get(\"plan\");" },
  { id: "M16", category: "browser", description: "Quantity hydration from the URL is disabled", file: "src/web/index.html", from: "if (query.has(\"quantity\")) document.querySelector(\"#quantity\").value = query.get(\"quantity\");", to: "if (false && query.has(\"quantity\")) document.querySelector(\"#quantity\").value = query.get(\"quantity\");" },
  { id: "M17", category: "browser", description: "URL autorun is disabled", file: "src/web/index.html", from: "if (query.get(\"autorun\") === \"1\") {", to: "if (false && query.get(\"autorun\") === \"1\") {" },
  { id: "M18", category: "browser", description: "UI renders subtotal instead of total", file: "src/web/index.html", from: "body.quote.total.toFixed(2)", to: "body.quote.subtotal.toFixed(2)" },
  { id: "M19", category: "browser", description: "Plan label is disconnected from its form control", file: "src/web/index.html", from: "<label for=\"plan\">Plan</label>", to: "<label for=\"missing-plan\">Plan</label>" },
  { id: "M20", category: "browser", description: "Quote result loses its accessible status role", file: "src/web/index.html", from: "role=\"status\" aria-label=\"Quote result\"", to: "role=\"note\" aria-label=\"Quote result\"" }
];

const controls = [
  { id: "C01", description: "Commutative multiplication refactor", file: "src/domain/quote.js", from: "const subtotal = unitPrice * quantity;", to: "const subtotal = quantity * unitPrice;" },
  { id: "C02", description: "Equivalent authorization predicate refactor", file: "src/application/quote-service.js", from: "if (role !== \"member\" && role !== \"admin\") {", to: "if (!(role === \"member\" || role === \"admin\")) {" }
];

function runPortfolio(logPrefix) {
  const startedAt = process.hrtime.bigint();
  const results = selectedLayers.map((layer) => {
    const execution = layer.run(`${logPrefix}-${layer.id}.log`);
    return {
      layer: layer.id,
      label: layer.label,
      command: layer.command,
      exitCode: execution.exitCode,
      durationMs: execution.durationMs,
      logPath: execution.logPath
    };
  });
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  return { results, durationMs, passed: results.every((result) => result.exitCode === 0) };
}

const baseline = runPortfolio(`${logRoot}/baseline`);
if (!baseline.passed) {
  const failed = baseline.results.filter((result) => result.exitCode !== 0).map((result) => result.layer).join(", ");
  throw new Error(`Baseline failed for layer(s): ${failed}`);
}

function executeCandidate(candidate) {
  return withMutation(candidate, () => {
    const run = runPortfolio(`${logRoot}/mutants/${candidate.id}`);
    const killedBy = run.results.filter((result) => result.exitCode !== 0).map((result) => result.layer);
    return {
      id: candidate.id,
      category: candidate.category || "control",
      description: candidate.description,
      file: candidate.file,
      status: killedBy.length > 0 ? "killed" : "survived",
      killedBy,
      durationMs: run.durationMs,
      layers: run.results.map((result) => ({
        layer: result.layer,
        status: result.exitCode === 0 ? "survived" : "killed",
        durationMs: result.durationMs,
        logPath: result.logPath
      }))
    };
  });
}

const mutantResults = mutants.map(executeCandidate);
const controlResults = controls.map(executeCandidate);

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

for (let warmup = 1; warmup <= warmups; warmup += 1) {
  const run = runPortfolio(`${logRoot}/benchmark/warmup-${String(warmup).padStart(2, "0")}`);
  if (!run.passed) throw new Error(`Benchmark warmup ${warmup} failed`);
}

const measuredRuns = [];
for (let iteration = 1; iteration <= iterations; iteration += 1) {
  const run = runPortfolio(`${logRoot}/benchmark/run-${String(iteration).padStart(2, "0")}`);
  if (!run.passed) throw new Error(`Benchmark iteration ${iteration} failed`);
  measuredRuns.push(run);
}

const durations = measuredRuns.map((run) => run.durationMs);
const detected = mutantResults.filter((mutant) => mutant.status === "killed");
const survived = mutantResults.filter((mutant) => mutant.status === "survived");
const mutationScore = (detected.length / mutantResults.length) * 100;
const controlsSurvived = controlResults.filter((control) => control.status === "survived").length;
const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: "2.0",
  kind: "four-layer-experiment-arm",
  generatedAt,
  commit: process.env.GITHUB_SHA || "local",
  arm: {
    id: arm.id,
    title: arm.title || arm.id,
    layers: arm.layers,
    uiSpecs: selectedUiSpecs,
    commands: selectedLayers.map((layer) => ({ id: layer.id, command: layer.command }))
  },
  protocol: {
    mutants: mutantResults.length,
    benignControls: controlResults.length,
    benchmarkWarmups: warmups,
    benchmarkIterations: iterations,
    interpretation: "Maximize realistic-mutant detection first; compare runtime only among portfolios with equivalent detection. UI duplication is pruned when cheaper selected layers already guard the same mutant class."
  },
  summary: {
    detected: detected.length,
    survived: survived.length,
    total: mutantResults.length,
    mutationScore,
    controlsSurvived,
    controlsTotal: controlResults.length,
    medianMs: median(durations),
    p95Ms: percentile(durations, 95),
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations)
  },
  mutants: mutantResults,
  benignControls: controlResults,
  benchmarkRuns: measuredRuns.map((run, index) => ({
    iteration: index + 1,
    durationMs: run.durationMs,
    layers: run.results.map((result) => ({ layer: result.layer, durationMs: result.durationMs, logPath: result.logPath }))
  }))
};

const layerLabel = {
  unit: "Unit",
  integration: "Integration",
  "e2e-api": "E2E API",
  "e2e-ui": "E2E UI"
};
const layerColumns = arm.layers.map((layer) => layerLabel[layer]);
const markdown = [
  `# Four-layer experiment — ${report.arm.title}`,
  "",
  `- Arm: \`${arm.id}\``,
  `- Layers: **${arm.layers.map((layer) => layerLabel[layer]).join(" + ")}**`,
  `- Mutation detection: **${detected.length}/${mutantResults.length} (${mutationScore.toFixed(1)}%)**`,
  `- Median portfolio runtime: **${report.summary.medianMs.toFixed(2)} ms**`,
  `- p95 portfolio runtime: **${report.summary.p95Ms.toFixed(2)} ms**`,
  `- Benign controls: **${controlsSurvived}/${controlResults.length} survived**`,
  ...(selectedUiSpecs.length > 0 ? [`- Playwright portfolio: ${selectedUiSpecs.map((spec) => `\`${spec}\``).join(", ")}`] : []),
  "",
  "## Mutant evidence",
  "",
  `| Mutant | Category | ${layerColumns.join(" | ")} | Portfolio result |`,
  `|---|---|${arm.layers.map(() => "---").join("|")}|---|`,
  ...mutantResults.map((mutant) => {
    const status = (layer) => mutant.layers.find((item) => item.layer === layer)?.status || "not-run";
    return `| ${mutant.id} | ${mutant.category} | ${arm.layers.map(status).join(" | ")} | **${mutant.status}** |`;
  }),
  "",
  "## Surviving mutants",
  "",
  ...(survived.length > 0 ? survived.map((mutant) => `- \`${mutant.id}\` ${mutant.description}`) : ["- None. This portfolio reached the mutation ceiling for the experiment panel."]),
  "",
  "## Benchmark protocol",
  "",
  `- ${warmups} warmup run(s) + ${iterations} measured run(s).`,
  "- A portfolio run executes the selected layers sequentially.",
  "- Browser duplication is intentionally pruned in mixed portfolios according to the selected lower layers.",
  "- Runtime is used only after mutation-detection equivalence; a faster portfolio with weaker detection is not declared better.",
  "",
  "## Commands",
  "",
  ...selectedLayers.map((layer) => `- ${layer.label}: \`${layer.command}\``),
  ""
].join("\n");

const csv = [
  ["mutant", "category", "description", ...arm.layers, "portfolio_status"],
  ...mutantResults.map((mutant) => [
    mutant.id,
    mutant.category,
    mutant.description,
    ...arm.layers.map((layer) => mutant.layers.find((item) => item.layer === layer)?.status || "not-run"),
    mutant.status
  ])
].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");

writeJson(`${outputRoot}/arm-result.json`, report);
writeText(`${outputRoot}/arm-result.md`, markdown);
writeText(`${outputRoot}/arm-result.csv`, csv);
console.log(markdown);

if (controlsSurvived !== controlResults.length) {
  console.error("One or more benign controls were killed; experiment validity is compromised.");
  process.exitCode = 1;
}
