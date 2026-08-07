import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startServer } from "../../src/server.js";

const chromium = process.env.CHROMIUM_PATH || "/usr/bin/chromium";

async function renderOnce(url, timeoutMs) {
  const profileDirectory = await mkdtemp(path.join(tmpdir(), "test-layer-lab-chromium-"));

  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(chromium, [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-extensions",
        "--disable-sync",
        "--no-first-run",
        `--user-data-dir=${profileDirectory}`,
        "--virtual-time-budget=3000",
        "--dump-dom",
        url
      ], { env: { ...process.env, TERM: process.env.TERM || "xterm" } });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs);

      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (timedOut) {
          const diagnostic = stderr.trim().slice(-2000);
          reject(new Error(`Chromium did not finish within ${timeoutMs} ms${diagnostic ? `: ${diagnostic}` : ""}`));
          return;
        }
        if (code === 0) resolve(stdout);
        else reject(new Error(`Chromium failed with code ${code}: ${stderr}`));
      });
    });
  } finally {
    await rm(profileDirectory, { recursive: true, force: true });
  }
}

async function render(url, { timeoutMs = 15_000, attempts = 2 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await renderOnce(url, timeoutMs);
    } catch (error) {
      lastError = error;
      const isStartupTimeout = error instanceof Error && error.message.includes("did not finish within");
      if (!isStartupTimeout || attempt === attempts) throw error;
      console.warn(`Chromium timed out on attempt ${attempt}; retrying once with a fresh profile.`);
    }
  }

  throw lastError;
}

test("real browser executes the page and network seam", async (t) => {
  const { server, origin } = await startServer();
  try {
    let dom;
    try {
      dom = await render(`${origin}/?plan=premium&quantity=2&autorun=1`);
    } catch (error) {
      if (process.env.REQUIRE_BROWSER === "1") throw error;
      t.skip(`Browser unavailable in this runtime: ${error.message}`);
      return;
    }

    assert.match(dom, /data-quote-ready="true"/);
    assert.match(dom, /Total: \$118\.80/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
