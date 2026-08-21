import process from "node:process";
import {
  assertBaseline,
  runNpmScript,
  withMutation,
  writeJson,
  writeText
} from "./mutation-harness.mjs";

const outputRoot = "reports/mutation";
const logRoot = `${outputRoot}/raw/manual`;
const layers = [
  { id: "unit", label: "Unit", script: "test:unit" },
  { id: "integration", label: "Integration", script: "test:integration" },
  { id: "e2e", label: "System E2E", script: "test:e2e" }
];

const mutants = [
  {
    id: "M01",
    description: "Premium unit price drifts from 60 to 61",
    file: "src/domain/quote.js",
    from: "  premium: 60",
    to: "  premium: 61",
    expectedKilledBy: ["unit", "integration", "e2e"]
  },
  {
    id: "M02",
    description: "Premium discount rate changes from 10% to 20%",
    file: "src/domain/quote.js",
    from: "subtotal * 0.1 : 0",
    to: "subtotal * 0.2 : 0",
    expectedKilledBy: ["unit", "integration", "e2e"]
  },
  {
    id: "M03",
    description: "Inclusive free-shipping boundary becomes exclusive",
    file: "src/domain/quote.js",
    from: "discountedSubtotal >= 80 ? 0 : 8",
    to: "discountedSubtotal > 80 ? 0 : 8",
    expectedKilledBy: ["unit"]
  },
  {
    id: "M04",
    description: "Approved shipping fee changes from 8 to 9",
    file: "src/domain/quote.js",
    from: "discountedSubtotal >= 80 ? 0 : 8",
    to: "discountedSubtotal >= 80 ? 0 : 9",
    expectedKilledBy: ["unit"]
  },
  {
    id: "M05",
    description: "Tax rate changes from 10% to 20%",
    file: "src/domain/quote.js",
    from: "const tax = discountedSubtotal * 0.1;",
    to: "const tax = discountedSubtotal * 0.2;",
    expectedKilledBy: ["unit", "integration", "e2e"]
  },
  {
    id: "M06",
    description: "Zero quantity is accepted",
    file: "src/domain/quote.js",
    from: "quantity <= 0",
    to: "quantity < 0",
    expectedKilledBy: ["unit"]
  },
  {
    id: "M07",
    description: "HTTP request mapping increments quantity",
    file: "src/http/app.js",
    from: "const quantity = Number(url.searchParams.get(\"quantity\"));",
    to: "const quantity = Number(url.searchParams.get(\"quantity\")) + 1;",
    expectedKilledBy: ["integration", "e2e"]
  },
  {
    id: "M08",
    description: "Authorization guard is removed at the application seam",
    file: "src/application/quote-service.js",
    from: "if (role !== \"member\" && role !== \"admin\") {",
    to: "if (false && role !== \"member\" && role !== \"admin\") {",
    expectedKilledBy: ["integration"]
  },
  {
    id: "M09",
    description: "HTTP layer discards the caller role and treats everyone as guest",
    file: "src/http/app.js",
    from: "const role = request.headers[\"x-role\"] || \"guest\";",
    to: "const role = \"guest\";",
    expectedKilledBy: ["integration", "e2e"]
  },
  {
    id: "M10",
    description: "Successful HTTP response corrupts the total",
    file: "src/http/app.js",
    from: "sendJson(response, 200, { quote });",
    to: "sendJson(response, 200, { quote: { ...quote, total: quote.total + 1 } });",
    expectedKilledBy: ["integration", "e2e"]
  },
  {
    id: "M11",
    description: "Page composition loses the primary heading",
    file: "src/web/index.html",
    from: "<h1>TRIMS Quote Lab</h1>",
    to: "<h2>TRIMS Quote Lab</h2>",
    expectedKilledBy: ["e2e"]
  },
  {
    id: "M12",
    description: "Browser wiring calls the wrong endpoint",
    file: "src/web/index.html",
    from: "fetch(`/api/quote?plan=${plan}&quantity=${quantity}`",
    to: "fetch(`/api/pricing?plan=${plan}&quantity=${quantity}`",
    expectedKilledBy: ["e2e"]
  }
];

const controls = [
  {
    id: "C01",
    description: "Commutative multiplication refactor",
    file: "src/domain/quote.js",
    from: "const subtotal = unitPrice * quantity;",
    to: "const subtotal = quantity * unitPrice;"
  },
  {
    id: "C02",
    description: "Equivalent authorization predicate refactor",
    file: "src/application/quote-service.js",
    from: "if (role !== \"member\" && role !== \"admin\") {",
    to: "if (!(role === \"member\" || role === \"admin\")) {"
  }
];

assertBaseline(layers.map((layer) => layer.script), logRoot);

function executeCandidate(candidate, expectedKilledBy = []) {
  return withMutation(candidate, () => {
    const layerResults = layers.map((layer) => {
      const logPath = `${logRoot}/${candidate.id}-${layer.id}.log`;
      const execution = runNpmScript(layer.script, { logPath });
      return {
        layer: layer.id,
        status: execution.exitCode === 0 ? "survived" : "killed",
        durationMs: execution.durationMs,
        logPath
      };
    });
    const killedBy = layerResults.filter((result) => result.status === "killed").map((result) => result.layer);
    return {
      id: candidate.id,
      description: candidate.description,
      file: candidate.file,
      expectedKilledBy,
      killedBy,
      matchesExpectation: JSON.stringify(killedBy) === JSON.stringify(expectedKilledBy),
      layers: layerResults
    };
  });
}

const mutantResults = mutants.map((mutant) => executeCandidate(mutant, mutant.expectedKilledBy));
const controlResults = controls.map((control) => executeCandidate(control, []));

const configurations = [
  { id: "unit", layers: ["unit"] },
  { id: "integration", layers: ["integration"] },
  { id: "e2e", layers: ["e2e"] },
  { id: "unit-integration", layers: ["unit", "integration"] },
  { id: "unit-e2e", layers: ["unit", "e2e"] },
  { id: "integration-e2e", layers: ["integration", "e2e"] },
  { id: "all", layers: ["unit", "integration", "e2e"] }
].map((configuration) => ({
  ...configuration,
  detected: mutantResults.filter((mutant) => mutant.killedBy.some((layer) => configuration.layers.includes(layer))).length,
  total: mutantResults.length
}));

const expectedLattice = {
  unit: 6,
  integration: 7,
  e2e: 8,
  "unit-integration": 10,
  "unit-e2e": 11,
  "integration-e2e": 9,
  all: 12
};

for (const configuration of configurations) {
  configuration.expectedDetected = expectedLattice[configuration.id];
  configuration.matchesExpectation = configuration.detected === configuration.expectedDetected;
}

const exclusiveGuardians = Object.fromEntries(layers.map((layer) => [
  layer.id,
  mutantResults.filter((mutant) => mutant.killedBy.length === 1 && mutant.killedBy[0] === layer.id).map((mutant) => mutant.id)
]));

const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: "1.0",
  kind: "mutation-layer-audit",
  generatedAt,
  commit: process.env.GITHUB_SHA || "local",
  decisionLayers: layers.map(({ id, label, script }) => ({ id, label, script })),
  browserBoundary: "The dedicated real-browser smoke remains a separate execution layer; this 12-mutant lattice reproduces the original unit/integration/system-E2E decision model.",
  mutants: mutantResults,
  benignControls: controlResults,
  exclusiveGuardians,
  lattice: configurations,
  summary: {
    realisticMutants: mutantResults.length,
    ceilingDetected: configurations.find((configuration) => configuration.id === "all").detected,
    benignControls: controlResults.length,
    benignControlsSurvived: controlResults.filter((control) => control.killedBy.length === 0).length
  }
};

const markdown = [
  "# Manual realistic-mutant panel",
  "",
  `- Generated: ${generatedAt}`,
  `- Commit: \`${report.commit}\``,
  `- Realistic mutants: **${report.summary.ceilingDetected}/${report.summary.realisticMutants} detected by the complete decision-layer set**`,
  `- Benign controls: **${report.summary.benignControlsSurvived}/${report.summary.benignControls} survived all audited decision layers**`,
  "",
  "## Detection matrix",
  "",
  "| Mutant | Unit | Integration | System E2E | Killed by |",
  "|---|---|---|---|---|",
  ...mutantResults.map((mutant) => {
    const statusFor = (layer) => mutant.layers.find((result) => result.layer === layer).status === "killed" ? "KILLED" : "survived";
    return `| ${mutant.id} | ${statusFor("unit")} | ${statusFor("integration")} | ${statusFor("e2e")} | ${mutant.killedBy.join(", ")} |`;
  }),
  "",
  "## Lattice",
  "",
  "| Configuration | Detection | Expected | Reproduced |",
  "|---|---:|---:|---|",
  ...configurations.map((configuration) => `| ${configuration.id} | ${configuration.detected}/${configuration.total} | ${configuration.expectedDetected}/${configuration.total} | ${configuration.matchesExpectation ? "yes" : "NO"} |`),
  "",
  "## Exclusive guardians",
  "",
  `- Unit: ${exclusiveGuardians.unit.map((id) => `\`${id}\``).join(", ")}`,
  `- Integration: ${exclusiveGuardians.integration.map((id) => `\`${id}\``).join(", ")}`,
  `- System E2E: ${exclusiveGuardians.e2e.map((id) => `\`${id}\``).join(", ")}`,
  "",
  "## Benign controls",
  "",
  ...controlResults.map((control) => `- ${control.id}: ${control.killedBy.length === 0 ? "SURVIVED" : `unexpectedly killed by ${control.killedBy.join(", ")}`} — ${control.description}`),
  "",
  "The mutation audit remains separate from Allure's native test-result model. Layer executions may still produce Allure reports independently; this artifact records mutant semantics, detection relationships, and controls."
].join("\n");

const csvRows = [
  ["id", "description", "file", "unit", "integration", "e2e", "killed_by"],
  ...mutantResults.map((mutant) => [
    mutant.id,
    mutant.description,
    mutant.file,
    mutant.layers.find((result) => result.layer === "unit").status,
    mutant.layers.find((result) => result.layer === "integration").status,
    mutant.layers.find((result) => result.layer === "e2e").status,
    mutant.killedBy.join("|")
  ])
].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");

writeJson(`${outputRoot}/manual-mutant-panel.json`, report);
writeText(`${outputRoot}/manual-mutant-panel.md`, markdown);
writeText(`${outputRoot}/manual-mutant-panel.csv`, csvRows);
console.log(markdown);

const failedExpectation = [
  ...mutantResults.filter((mutant) => !mutant.matchesExpectation),
  ...controlResults.filter((control) => control.killedBy.length > 0),
  ...configurations.filter((configuration) => !configuration.matchesExpectation)
];
if (failedExpectation.length > 0) process.exitCode = 1;
