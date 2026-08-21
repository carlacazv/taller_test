import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

export const root = process.cwd();
export const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

export function ensureDirectory(directory) {
  mkdirSync(path.resolve(root, directory), { recursive: true });
}

function occurrences(source, fragment) {
  if (!fragment) return 0;
  let count = 0;
  let index = 0;
  while ((index = source.indexOf(fragment, index)) !== -1) {
    count += 1;
    index += fragment.length;
  }
  return count;
}

export function applyMutation(mutation) {
  const absolutePath = path.resolve(root, mutation.file);
  const original = readFileSync(absolutePath, "utf8");
  const matchCount = occurrences(original, mutation.from);
  if (matchCount !== 1) {
    throw new Error(`${mutation.id}: expected exactly one match in ${mutation.file}, found ${matchCount}`);
  }
  const mutated = original.replace(mutation.from, mutation.to);
  writeFileSync(absolutePath, mutated, "utf8");
  return () => writeFileSync(absolutePath, original, "utf8");
}

export function runCommand({ args, env = {}, logPath }) {
  const startedAt = process.hrtime.bigint();
  const result = spawnSync(npmCommand, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
    maxBuffer: 20 * 1024 * 1024,
    timeout: Number(process.env.MUTATION_COMMAND_TIMEOUT_MS || "60000"),
    killSignal: "SIGKILL"
  });
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const output = `${result.stdout || ""}${result.stderr || ""}`;

  if (result.error) {
    throw new Error(`Command npm ${args.join(" ")} could not complete: ${result.error.message}`);
  }

  if (logPath) {
    const absoluteLog = path.resolve(root, logPath);
    mkdirSync(path.dirname(absoluteLog), { recursive: true });
    writeFileSync(absoluteLog, output, "utf8");
  }

  return {
    exitCode: result.status ?? 1,
    durationMs,
    logPath: logPath || null
  };
}

export function runNpmScript(script, options = {}) {
  return runCommand({ ...options, args: ["run", script] });
}

export function assertBaseline(scripts, logDirectory) {
  for (const script of scripts) {
    const result = runNpmScript(script, {
      logPath: `${logDirectory}/baseline-${script.replaceAll(":", "-")}.log`
    });
    if (result.exitCode !== 0) {
      throw new Error(`Baseline ${script} failed. Evidence: ${result.logPath}`);
    }
  }
}

export function withMutation(mutation, run) {
  const restore = applyMutation(mutation);
  try {
    return run();
  } finally {
    restore();
  }
}

export function writeJson(relativePath, value) {
  const absolutePath = path.resolve(root, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeText(relativePath, value) {
  const absolutePath = path.resolve(root, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}
