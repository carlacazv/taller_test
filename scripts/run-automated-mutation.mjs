import process from "node:process";
import {
  assertBaseline,
  runNpmScript,
  withMutation,
  writeJson,
  writeText
} from "./mutation-harness.mjs";

const outputRoot = "reports/mutation";
const logRoot = `${outputRoot}/raw/automated`;

const mutants = [
  {
    id: "A01",
    operator: "numeric-literal",
    description: "Premium unit price drifts from 60 to 61",
    file: "src/domain/quote.js",
    from: "  premium: 60",
    to: "  premium: 61"
  },
  {
    id: "A02",
    operator: "numeric-literal",
    description: "Premium discount rate changes from 10% to 20%",
    file: "src/domain/quote.js",
    from: "subtotal * 0.1 : 0",
    to: "subtotal * 0.2 : 0"
  },
  {
    id: "A03",
    operator: "conditional-boundary",
    description: "Free-shipping boundary becomes exclusive",
    file: "src/domain/quote.js",
    from: "discountedSubtotal >= 80 ? 0 : 8",
    to: "discountedSubtotal > 80 ? 0 : 8"
  },
  {
    id: "A04",
    operator: "numeric-literal",
    description: "Shipping fee changes from 8 to 9",
    file: "src/domain/quote.js",
    from: "discountedSubtotal >= 80 ? 0 : 8",
    to: "discountedSubtotal >= 80 ? 0 : 9"
  },
  {
    id: "A05",
    operator: "conditional-boundary",
    description: "Zero quantity is no longer rejected",
    file: "src/domain/quote.js",
    from: "quantity <= 0",
    to: "quantity < 0"
  },
  {
    id: "A06",
    operator: "authorization-removal",
    description: "Authorization guard is disabled",
    file: "src/application/quote-service.js",
    from: "if (role !== \"member\" && role !== \"admin\") {",
    to: "if (false && role !== \"member\" && role !== \"admin\") {"
  },
  {
    id: "A07",
    operator: "request-mapping",
    description: "HTTP quantity mapping adds one item",
    file: "src/http/app.js",
    from: "const quantity = Number(url.searchParams.get(\"quantity\"));",
    to: "const quantity = Number(url.searchParams.get(\"quantity\")) + 1;"
  },
  {
    id: "A08",
    operator: "endpoint-wiring",
    description: "Browser wiring calls the wrong quote endpoint",
    file: "src/web/index.html",
    from: "fetch(`/api/quote?plan=${plan}&quantity=${quantity}`",
    to: "fetch(`/api/pricing?plan=${plan}&quantity=${quantity}`"
  }
];

assertBaseline(["test"], logRoot);

const results = mutants.map((mutant) => withMutation(mutant, () => {
  const logPath = `${logRoot}/${mutant.id}.log`;
  const execution = runNpmScript("test", { logPath });
  return {
    id: mutant.id,
    operator: mutant.operator,
    description: mutant.description,
    file: mutant.file,
    status: execution.exitCode === 0 ? "survived" : "killed",
    durationMs: execution.durationMs,
    logPath
  };
}));

const killed = results.filter((result) => result.status === "killed").length;
const survived = results.length - killed;
const mutationScore = results.length === 0 ? 0 : (killed / results.length) * 100;
const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: "1.0",
  kind: "mutation-test-result-set",
  generatedAt,
  commit: process.env.GITHUB_SHA || "local",
  command: "npm run test",
  scope: "Automated deterministic mutation smoke across unit, integration, and system E2E tests",
  summary: { total: results.length, killed, survived, mutationScore },
  mutants: results
};

const markdown = [
  "# Automated mutation evidence",
  "",
  `- Generated: ${generatedAt}`,
  `- Commit: \`${report.commit}\``,
  `- Command per mutant: \`${report.command}\``,
  `- Mutation score: **${killed}/${results.length} killed (${mutationScore.toFixed(2)}%)**`,
  "",
  "| Mutant | Operator | File | Result | Duration |",
  "|---|---|---|---|---:|",
  ...results.map((result) => `| ${result.id} | ${result.operator} | \`${result.file}\` | ${result.status.toUpperCase()} | ${result.durationMs.toFixed(2)} ms |`),
  "",
  "Mutation evidence is intentionally stored separately from Allure test-result files. The JSON contract can be attached, linked, or consumed by an Allure 3 plugin without pretending a mutant is a normal test case."
].join("\n");

writeJson(`${outputRoot}/automated-mutation.json`, report);
writeText(`${outputRoot}/automated-mutation.md`, markdown);
console.log(markdown);

if (survived > 0) process.exitCode = 1;
