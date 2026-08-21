const fallback = {
  generatedAt: "2026-08-05T10:54:07.296Z",
  commit: "4bb518a0e1ce5a98cda9f0a16f93471307d517d7",
  node: "v24.18.0",
  platform: "linux/x64",
  iterations: 5,
  warmups: 1,
  comparison: [
    { label: "Unit", tests: 6, medianMs: 104.49, p95Ms: 110.70, relativeCost: 1.00, status: "passed" },
    { label: "Integration", tests: 3, medianMs: 209.58, p95Ms: 219.70, relativeCost: 2.01, status: "passed" },
    { label: "System E2E", tests: 2, medianMs: 217.11, p95Ms: 228.95, relativeCost: 2.08, status: "passed" },
    { label: "Browser E2E", tests: 1, medianMs: 973.23, p95Ms: 1653.23, relativeCost: 9.31, status: "passed" }
  ]
};

function ms(value) {
  return `${Number(value).toFixed(2)} ms`;
}

function shortSha(value) {
  if (!value || value === "local") return value || "unknown";
  return value.slice(0, 8);
}

function updateSuiteMetric(rows) {
  const suiteMetric = [...document.querySelectorAll(".metric")].find(
    (metric) => metric.querySelector("span")?.textContent === "Current Allure suite"
  );
  const totalTests = rows.reduce((sum, row) => sum + (Number(row.tests) || 0), 0);

  if (!suiteMetric || totalTests === 0) return;

  suiteMetric.querySelector("strong").textContent = String(totalTests);
  suiteMetric.querySelector("small").textContent = `tests across ${rows.length} execution layers`;
}

function render(data, live) {
  const tbody = document.querySelector("#runtime-table");
  const chart = document.querySelector("#runtime-chart");
  const protocol = document.querySelector("#runtime-protocol");
  const buildLine = document.querySelector("#build-line");
  const rows = Array.isArray(data.comparison) ? data.comparison : [];
  const maxMedian = Math.max(...rows.map((row) => Number(row.medianMs) || 0), 1);

  tbody.innerHTML = rows.map((row) => `
    <tr>
      <td><strong>${row.label}</strong></td>
      <td>${row.tests ?? "n/a"}</td>
      <td>${ms(row.medianMs)}</td>
      <td>${ms(row.p95Ms)}</td>
      <td>${Number(row.relativeCost).toFixed(2)}×</td>
      <td><span class="pill ${row.status === "passed" ? "passed" : "rejected"}">${row.status}</span></td>
    </tr>
  `).join("");

  chart.innerHTML = rows.map((row) => {
    const width = Math.max(2, (Number(row.medianMs) / maxMedian) * 100);
    return `
      <div class="chart-row">
        <strong>${row.label}</strong>
        <div class="chart-track"><div class="chart-bar" style="width:${width}%"></div></div>
        <span class="chart-value">${ms(row.medianMs)}</span>
      </div>
    `;
  }).join("");

  updateSuiteMetric(rows);

  const generated = data.generatedAt ? new Date(data.generatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "unknown";
  protocol.textContent = `${data.warmups ?? "?"} warmup run(s) + ${data.iterations ?? "?"} measured run(s) per layer · ${data.node ?? "Node unknown"} · ${data.platform ?? "platform unknown"} · commit ${shortSha(data.commit)}.`;
  buildLine.textContent = `${live ? "Live Pages evidence" : "Last verified fallback evidence"} · generated ${generated} · commit ${shortSha(data.commit)}.`;
}

async function loadEvidence() {
  try {
    const response = await fetch("./evidence/runtime-comparison.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    render(await response.json(), true);
  } catch (error) {
    console.warn("Generated runtime evidence is unavailable; using the last verified baseline.", error);
    render(fallback, false);
  }
}

loadEvidence();
