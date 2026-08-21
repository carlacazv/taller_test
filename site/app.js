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

function renderPortfolioDecision() {
  const nav = document.querySelector(".topbar nav");
  if (nav && !nav.querySelector('[href="./portfolio-analysis.html"]')) {
    nav.insertAdjacentHTML("afterbegin", '<a href="./portfolio-analysis.html">Portfolio decision</a>');
  }

  const primaryAction = document.querySelector(".actions .button.primary");
  if (primaryAction) {
    primaryAction.href = "./portfolio-analysis.html";
    primaryAction.textContent = "Open 15-portfolio comparison";
  }

  const decision = document.querySelector(".decision-card");
  if (decision) {
    const status = decision.querySelector(".status");
    const title = decision.querySelector("strong");
    const copy = decision.querySelector("p");
    if (status) status.textContent = "Selected portfolio";
    if (title) title.textContent = "E2E API + focused E2E UI";
    if (copy) copy.textContent = "It preserved 20/20 realistic-mutant detection with 2/2 benign controls surviving, then had the lowest same-run median among the 100%-detection portfolios. It was 31.4% faster than E2E UI only in the tournament.";
  }

  const metrics = [...document.querySelectorAll(".metric")];
  const headline = [
    ["Portfolio lattice", "15", "every non-empty combination of Unit, Integration, E2E API, and E2E UI"],
    ["Realistic mutants", "20/20", "detected by the selected portfolio"],
    ["Benign controls", "2/2", "survived as expected"],
    ["UI-only penalty", "31.4%", "slower median than E2E API + E2E UI at equal 100% detection"]
  ];
  metrics.slice(0, headline.length).forEach((metric, index) => {
    const [label, value, description] = headline[index];
    const span = metric.querySelector("span");
    const strong = metric.querySelector("strong");
    const small = metric.querySelector("small");
    if (span) span.textContent = label;
    if (strong) strong.textContent = value;
    if (small) small.textContent = description;
  });

  const detection = document.querySelector("#detection");
  if (detection) {
    const eyebrow = detection.querySelector(".section-heading .eyebrow");
    const heading = detection.querySelector(".section-heading h2");
    const intro = detection.querySelector(".section-heading > p");
    if (eyebrow) eyebrow.textContent = "Historical 3-layer baseline";
    if (heading) heading.textContent = "The original lattice that motivated the portfolio experiment.";
    if (intro) intro.innerHTML = 'This section preserves the earlier 12-mutant experiment for traceability. The current architecture decision comes from the newer <a href="./portfolio-analysis.html">15-portfolio, 20-mutant comparison</a>.';
  }
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

renderPortfolioDecision();
loadEvidence();
