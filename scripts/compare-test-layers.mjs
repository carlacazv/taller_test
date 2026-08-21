import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
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
    runner: "node-test",
    purpose: "Business rules, calculations, validation, and boundary values"
  },
  {
    id: "integration",
    label: "Integration",
    directory: "tests/integration",
    runner: "node-test",
    purpose: "HTTP contract, authorization, status codes, and error payloads"
  },
  {
    id: "e2e",
    label: "System E2E",
    directory: "tests/e2e",
    runner: "node-test",
    purpose: "Composed application flow through the public HTTP boundary"
  },
  {
    id: "browser",
    label: "Browser E2E",
    directory: "tests/browser",
    runner: "playwright",
    extraTraceFiles: ["playwright.config.js"],
    purpose: "Playwright-driven DOM execution, client JavaScript, and browser-to-server wiring"
  }
];

mkdirSync(rawDirectory, { recursive: true });

function walkFiles(directory) {
  const absoluteDirectory = path.join(root, directory);
  return readdirSync(absoluteDirectory, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = path.join(directory, entry.name);
      return entry.isDirectory() ? walkFiles(relativePath) : [relativePath];
    })
    .sort();
}

function nodeTestFiles(layer) {
  return walkFiles(layer.directory).filter((file) => file.endsWith(".test.js"));
}

function traceFiles(layer) {
  const discovered = walkFiles(layer.directory).filter((file) => file.endsWith(".js"));
  return [...new Set([...discovered, ...(layer.extraTraceFiles || [])])].sort();
}

function parseTapMetric(output, name) {
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

function evidenceStem(layer, phase, runNumber) {
  const run = String(runNumber).padStart(2, "0");
  return phase === "warmup"
    ? `${layer.id}-warmup-${run}`
    : `${layer.id}-run-${run}`;
}

function runNodeLayer(layer, phase, runNumber) {
  const files = nodeTestFiles(layer);
  if (files.length === 0) {
    throw new Error(`No test files found for ${layer.label}`);
  }

  const args = ["--test", "--test-reporter", "tap", ...files];
  const startedAt = process.hrtime.bigint();
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 10 * 1024 * 1024
  });
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const logPath = path.join(rawDirectory, `${evidenceStem(layer, phase, runNumber)}.tap`);

  writeFileSync(logPath, output, "utf8");

  return {
    exitCode: result.status ?? 1,
    durationMs,
    tests: parseTapMetric(output, "tests"),
    passed: parseTapMetric(output, "pass"),
    failed: parseTapMetric(output, "fail"),
    skipped: parseTapMetric(output, "skipped"),
    cancelled: parseTapMetric(output, "cancelled"),
    todo: parseTapMetric(output, "todo"),
    logPath: path.relative(root, logPath)
  };
}

function runPlaywrightLayer(layer, phase, runNumber) {
  const stem = evidenceStem(layer, phase, runNumber);
  const logPath = path.join(rawDirectory, `${stem}.log`);
  const jsonPath = path.join(rawDirectory, `${stem}.json`);
  const cliPath = path.join(root, "node_modules", "@playwright", "test", "cli.js");

  if (!existsSync(cliPath)) {
    throw new Error("Playwright CLI is unavailable. Run npm install before comparing layers.");
  }

  const startedAt = process.hrtime.bigint();
  const result = spawnSync(
    process.execPath,
    [cliPath, "test", "--config=playwright.config.js", "--reporter=json"],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: jsonPath
      },
      maxBuffer: 20 * 1024 * 1024
    }
  );
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  writeFileSync(logPath, output, "utf8");

  const report = existsSync(jsonPath)
    ? JSON.parse(readFileSync(jsonPath, "utf8"))
    : null;
  const stats = report?.stats;
  const tests = stats
    ? stats.expected + stats.unexpected + stats.flaky + stats.skipped
    : null;

  return {
    exitCode: result.status ?? 1,
    durationMs,
    tests,
    passed: stats ? stats.expected + stats.flaky : null,
    failed: stats?.unexpected ?? null,
    skipped: stats?.skipped ?? null,
    flaky: stats?.flaky ?? null,
    logPath: path.relative(root, logPath),
    reportPath: existsSync(jsonPath) ? path.relative(root, jsonPath) : null
  };
}

function runLayer(layer, phase, runNumber) {
  return layer.runner === "playwright"
    ? runPlaywrightLayer(layer, phase, runNumber)
    : runNodeLayer(layer, phase, runNumber);
}

const comparison = [];

for (const layer of layers) {
  for (let warmup = 1; warmup <= warmups; warmup += 1) {
    const result = runLayer(layer, "warmup", warmup);
    if (result.exitCode !== 0) {
      throw new Error(
        `${layer.label} warmup failed with exit code ${result.exitCode}. Evidence: ${result.logPath}`
      );
    }
  }

  const runs = [];
  for (let run = 1; run <= iterations; run += 1) {
    runs.push(runLayer(layer, "measured", run));
  }

  const durations = runs.map((run) => run.durationMs);
  comparison.push({
    ...layer,
    testFiles: traceFiles(layer).map((file) => ({ file, sha256: sha256(file) })),
    status: runs.every((run) => run.exitCode === 0) ? "passed" : "failed",
    tests: runs.at(-1)?.tests,
    passed: runs.at(-1)?.passed,
    failed: runs.at(-1)?.failed,
    skipped: runs.at(-1)?.skipped,
    flaky: runs.at(-1)?.flaky ?? 0,
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
  "| Layer | Purpose | Tests | Passed | Failed | Skipped | Flaky | Median | p95 | Relative cost | Result |",
  "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|",
  ...comparison.map((layer) =>
    `| ${layer.label} | ${layer.purpose} | ${layer.tests ?? "n/a"} | ${layer.passed ?? "n/a"} | ${layer.failed ?? "n/a"} | ${layer.skipped ?? "n/a"} | ${layer.flaky ?? "n/a"} | ${layer.medianMs.toFixed(2)} ms | ${layer.p95Ms.toFixed(2)} ms | ${layer.relativeCost.toFixed(2)}x | ${layer.status} |`
  ),
  "",
  "## Traceable evidence",
  "",
  ...comparison.flatMap((layer) => [
    `### ${layer.label}`,
    "",
    ...layer.testFiles.map(
      (testFile) => `- \`${testFile.file}\` — SHA-256 \`${testFile.sha256}\``
    ),
    `- Raw runner evidence: \`reports/test-layer-comparison/raw/${layer.id}-*\``,
    ""
  ]),
  "## Interpretation boundary",
  "",
  "Runtime cost is measured only for this repository, runner, commit, test data, and runner configuration. Detection capability is described by the assertions and mutation evidence; timing alone must not be used to remove a layer."
];

const markdown = `${markdownLines.join("\n")}\n`;
writeFileSync(
  path.join(outputDirectory, "comparison.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8"
);
writeFileSync(path.join(outputDirectory, "comparison.md"), markdown, "utf8");

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
}

console.log(markdown);

if (comparison.some((layer) => layer.status !== "passed")) {
  process.exitCode = 1;
}
