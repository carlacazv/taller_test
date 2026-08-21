(() => {
  const root = document.documentElement;
  if (root.dataset.portfolioAnalysisReady === "true") return;
  root.dataset.portfolioAnalysisReady = "true";

  const table = document.querySelector("#portfolio-table");
  const scatter = document.querySelector("#scatter");
  const filters = [...document.querySelectorAll(".filter")];
  let evidence = null;
  let activeFilter = "all";

  const duration = (value) => `${(value / 1000).toFixed(value >= 1000 ? 2 : 3)} s`;
  const relative = (value) => `${value.toFixed(2)}×`;

  function renderTable() {
    const winnerMedian = evidence.decision.medianMs;
    const rows = evidence.portfolios
      .filter((portfolio) => activeFilter === "all" || (activeFilter === "full" ? portfolio.mutationScore === 100 : portfolio.mutationScore < 100))
      .sort((a, b) => b.mutationScore - a.mutationScore || a.medianMs - b.medianMs);

    table.innerHTML = rows.map((portfolio) => {
      const delta = ((portfolio.medianMs - winnerMedian) / winnerMedian) * 100;
      const verdict = portfolio.verdict === "winner"
        ? '<span class="pill winner">Selected</span>'
        : portfolio.mutationScore === 100
          ? '<span class="pill full">100% alternative</span>'
          : '<span class="pill rejected">Rejected: detection</span>';

      return `<tr class="${portfolio.verdict === "winner" ? "winner-row" : ""}">
        <td><strong>${portfolio.title}</strong><div class="layers">${portfolio.layers.join(" + ")}</div></td>
        <td><strong>${portfolio.detected}/${portfolio.total}</strong> · ${portfolio.mutationScore}%</td>
        <td>${duration(portfolio.medianMs)}</td>
        <td>${duration(portfolio.p95Ms)}</td>
        <td>${relative(portfolio.relativeCost)}</td>
        <td>${portfolio.verdict === "winner" ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`}</td>
        <td>${verdict}</td>
        <td><a href="https://github.com/carlacazv/test-layer-lab/pull/${portfolio.pr}">#${portfolio.pr}</a></td>
      </tr>`;
    }).join("");
  }

  function renderScatter() {
    const width = 1000;
    const height = 410;
    const margin = { top: 24, right: 36, bottom: 54, left: 62 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const maxX = Math.max(...evidence.portfolios.map((portfolio) => portfolio.medianMs)) * 1.05;
    const minY = 20;
    const maxY = 105;
    const x = (value) => margin.left + (value / maxX) * innerWidth;
    const y = (value) => margin.top + ((maxY - value) / (maxY - minY)) * innerHeight;
    const xTicks = [0, 1000, 2000, 3000, 4000].filter((value) => value <= maxX);
    const yTicks = [25, 50, 75, 100];

    const gridX = xTicks.map((value) => `<g><line x1="${x(value)}" y1="${margin.top}" x2="${x(value)}" y2="${height - margin.bottom}" stroke="#21374e"/><text x="${x(value)}" y="${height - 24}" fill="#91a5bb" font-size="12" text-anchor="middle">${value / 1000}s</text></g>`).join("");
    const gridY = yTicks.map((value) => `<g><line x1="${margin.left}" y1="${y(value)}" x2="${width - margin.right}" y2="${y(value)}" stroke="#21374e"/><text x="${margin.left - 12}" y="${y(value) + 4}" fill="#91a5bb" font-size="12" text-anchor="end">${value}%</text></g>`).join("");

    const points = evidence.portfolios.map((portfolio) => {
      const isWinner = portfolio.verdict === "winner";
      const fullDetection = portfolio.mutationScore === 100;
      const fill = isWinner ? "#5dd6b7" : fullDetection ? "#78a9ff" : "#ff8d9a";
      const radius = isWinner ? 10 : fullDetection ? 7 : 6;
      const label = isWinner ? `<text x="${x(portfolio.medianMs) + 14}" y="${y(portfolio.mutationScore) - 12}" fill="#5dd6b7" font-size="13" font-weight="800">Selected: ${portfolio.title}</text>` : "";
      return `<g><circle cx="${x(portfolio.medianMs)}" cy="${y(portfolio.mutationScore)}" r="${radius}" fill="${fill}" opacity="${isWinner ? 1 : .86}"><title>${portfolio.title}\n${portfolio.mutationScore}% detection\n${(portfolio.medianMs / 1000).toFixed(2)} s median</title></circle>${label}</g>`;
    }).join("");

    scatter.innerHTML = `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      ${gridX}${gridY}
      <text x="${width / 2}" y="${height - 4}" fill="#91a5bb" font-size="12" text-anchor="middle">Same-run median runtime →</text>
      <text x="18" y="${height / 2}" fill="#91a5bb" font-size="12" text-anchor="middle" transform="rotate(-90 18 ${height / 2})">Mutation detection →</text>
      ${points}
    </svg>`;
  }

  filters.forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach((item) => item.classList.toggle("active", item === button));
    renderTable();
  }));

  fetch("./evidence/four-layer-portfolio-comparison.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      evidence = data;
      renderTable();
      renderScatter();
    })
    .catch((error) => {
      table.innerHTML = `<tr><td colspan="8">Could not load comparison evidence: ${error.message}</td></tr>`;
      scatter.innerHTML = `<p class="chart-note">Could not load chart evidence: ${error.message}</p>`;
    });
})();
