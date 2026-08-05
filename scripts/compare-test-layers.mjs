import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outputDirectory = path.join(root, "reports", "test-layer-comparison");
const rawDirectory = path.join(outputDirectory, "raw");
const iterations = Number.parseInt(process.env.COMPARISON_ITERATIONS || "5", 10);
const warmups = Number.parseInt(process.env.COMPARISON_WARMUPS || "1", 10);

if (!Number.isInteger(iterations) || iterations < 1) {
  throw new Error("COMPARISON_ITERATIONS must be a positive integer");
}

if (!Number.isInteger(warmups) || warmups < 0) {
  throw new Error("COMPARISON_WARMUPS must be a non-negative integer");
}

const layers = [
  {
    id: "unit",
    label: "Unit",
    directory: "tests/unit",
    purpose: "Business rules, calculations, validation, and boundary values"
  },
  {
    id: "integration",
    label: "Integration",
    directory: "tests/integration",
    purpose: "HTTP contract, authorization, status codes, and error payloads"
  },
  {
    id: "e2e",
    label: "System E2E",
    directory: "tests/e2e",
    purpose: "Composed application flow through the public HTTP boundary"
  },
  {
    id: "browser",
    label: "Browser E2E",
    directory: "tests/browser",
    purpose: "Real DOM execution, client-side JavaScript, and network wiring"
  }
];

mkdirSync(rawDirectory, { recursive: true });

function testFiles(directory) {
  const absoluteDirectory = path.join(root, directory);
  return readdirSync(absoluteDirectory)
    .filter((file) => file.endsWith(".test.js"))
    .sort()
    .map((file) => path.join(directory, file));
}

function parseMetric(output, name) {
  const match = output.match(new RegExp(`^# ${name} (\\d+(?:\\.\\d+)?)$`, "m"));
  return match ? Number(match[1]) : null;
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index];
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(path.join(root, file))).digest("hex");
}

function runLayer(layer, phase, runNumber) {
  const files = testFiles(layer.directory);
  if (files.length === 0) {
    throw new Error(`No test files found for ${layer.label}`);
  }

  const args = ["--test", "--test-reporter", "tap", ...files];
  const startedAt = process.hrtime.bigint();
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      ...(layer.id === "browser" ? { REQUIRE_BROWSER: "1" } : {})
    },
    maxBuffer: 10 * 1024 * 1024
  });
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const output = `${result.stdout || ""}${result.stderr || ""}`;

  if (phase === "measured") {
    const logName = `${layer.id}-run-${String(runNumber).padStart(2, "0")}.tap`;
    writeFileSync(path.join(rawDirectory, logName), output, "utf8");
  }

  return {
    exitCode: result.status ?? 1,
    durationMs,
    tests: parseMetric(output, "tests"),
    passed: parseMetric(output, "pass"),
    failed: parseMetric(output, "fail"),
    skipped: parseMetric(output, "skipped"),
    cancelled: parseMetric(output, "cancelled"),
    todo: parseMetric(output, "todo")
  };
}

const comparison = [];

for (const layer of layers) {
  for (let warmup = 1; warmup <= warmups; warmup += 1) {
    const result = runLayer(layer, "warmup", warmup);
    if (result.exitCode !== 0) {
      throw new Error(`${layer.label} warmup failed with exit code ${result.exitCode}`);
    }
  }

  const runs = [];
  for (let run = 1; run <= iterations; run += 1) {
    runs.push(runLayer(layer, "measured", run));
  }

  const durations = runs.map((run) => run.durationMs);
  comparison.push({
    ...layer,
    testFiles: testFiles(layer.directory).map((file) => ({ file, sha256: sha256(file) })),
    status: runs.every((run) => run.exitCode === 0) ? "passed" : "failed",
    tests: runs.at(-1)?.tests,
    passed: runs.at(-1)?.passed,
    failed: runs.at(-1)?.failed,
    skipped: runs.at(-1)?.skipped,
    medianMs: median(durations),
    p95Ms: percentile(durations, 95),
    minimumMs: Math.min(...durations),
    maximumMs: Math.max(...durations),
    runs
  });
}

const fastestMedian = Math.min(...comparison.map((layer) => layer.medianMs));
for (const layer of comparison) {
  layer.relativeCost = layer.medianMs / fastestMedian;
}

const generatedAt = new Date().toISOString();
const commit = process.env.GITHUB_SHA || "local";
const result = {
  generatedAt,
  commit,
  node: process.version,
  platform: `${process.platform}/${process.arch}`,
  iterations,
  warmups,
  comparison
};

const markdownLines = [
  "# Test-layer comparison evidence",
  "",
  `- Generated: ${generatedAt}`,
  `- Commit: \`${commit}\``,
  `- Runtime: \`${process.version}\` on \`${process.platform}/${process.arch}\``,
  `- Protocol: ${warmups} warmup run(s) + ${iterations} measured run(s) per layer`,
  "",
  "| Layer | Purpose | Tests | Passed | Failed | Skipped | Median | p95 | Relative cost | Result |",
  "|---|---|---:|---:|---:|---:|---:|---:|---:|---|",
  ...comparison.map((layer) =>
    `| ${layer.label} | ${layer.purpose} | ${layer.tests ?? "n/a"} | ${layer.passed ?? "n/a"} | ${layer.failed ?? "n/a"} | ${layer.skipped ?? "n/a"} | ${layer.medianMs.toFixed(2)} ms | ${layer.p95Ms.toFixed(2)} ms | ${layer.relativeCost.toFixed(2)}x | ${layer.status} |`
  ),
  "",
  "## Traceable evidence",
  "",
  ...comparison.flatMap((layer) => [
    `### ${layer.label}`,
    "",
    ...layer.testFiles.map((testFile) => `- \`${testFile.file}\` — SHA-256 \`${testFile.sha256}\``),
    `- Raw TAP logs: \`reports/test-layer-comparison/raw/${layer.id}-run-*.tap\``,
    ""
  ]),
  "## Interpretation boundary",
  "",
  "Runtime cost is measured only for this repository, runner, commit, and test data. Detection capability is described by the assertions in each test file; timing alone must not be used to remove a layer."
];

const markdown = `${markdownLines.join("\n")}\n`;
writeFileSync(path.join(outputDirectory, "comparison.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
writeFileSync(path.join(outputDirectory, "comparison.md"), markdown, "utf8");

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
}

console.log(markdown);

if (comparison.some((layer) => layer.status !== "passed")) {
  process.exitCode = 1;
}
