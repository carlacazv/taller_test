# Test Layer Lab

[![Quality Checks](https://github.com/carlacazv/test-layer-lab/actions/workflows/quality-checks.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/quality-checks.yml)
[![Unit Tests](https://github.com/carlacazv/test-layer-lab/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/unit-tests.yml)
[![Integration Tests](https://github.com/carlacazv/test-layer-lab/actions/workflows/integration-tests.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/integration-tests.yml)
[![System E2E Tests](https://github.com/carlacazv/test-layer-lab/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/e2e-tests.yml)
[![Browser E2E Tests](https://github.com/carlacazv/test-layer-lab/actions/workflows/browser-tests.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/browser-tests.yml)
[![Allure Report](https://github.com/carlacazv/test-layer-lab/actions/workflows/allure-report.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/allure-report.yml)
[![Test Layer Comparison](https://github.com/carlacazv/test-layer-lab/actions/workflows/test-layer-comparison.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/test-layer-comparison.yml)
[![Evidence Pages](https://github.com/carlacazv/test-layer-lab/actions/workflows/evidence-pages.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/evidence-pages.yml)

An evidence-driven JavaScript laboratory for comparing unit, HTTP integration, system E2E, and real-browser E2E test layers.

The project measures two different questions separately:

1. **Execution cost:** how expensive is each layer under the same protocol?
2. **Detection effectiveness:** which realistic defects become uncovered when a layer is removed?

Runtime alone is never treated as evidence that a test layer is unnecessary.

## Evidence dashboard

The GitHub Pages dashboard is built only after all four test layers pass. On each `main` deployment it regenerates the runtime comparison, embeds the consolidated Allure report, and publishes the traceability evidence used by the dashboard.

Expected project URL after GitHub Pages is enabled with **Settings → Pages → Source: GitHub Actions**:

`https://carlacazv.github.io/test-layer-lab/`

The Pages workflow publishes:

- the QA-facing evidence dashboard;
- current runtime comparison JSON and Markdown;
- the consolidated Allure HTML report;
- a copy of the dominant-configuration evidence;
- a downloadable workflow artifact with comparison and Allure evidence.

## Test layers

| Layer | Test boundary | Command |
|---|---|---|
| Unit | Domain calculations, validation, and boundary values | `npm run test:unit` |
| Integration | HTTP contract, authorization, and error payloads | `npm run test:integration` |
| System E2E | Composed application through its public HTTP boundary | `npm run test:e2e` |
| Browser E2E | DOM execution, client JavaScript, and network wiring | `REQUIRE_BROWSER=1 npm run test:browser` |

Each layer has an independent GitHub Actions workflow. Test workflows publish raw logs, Allure result files, and an Allure HTML report even when tests fail.

## CI evidence preservation

Pull-request workflows cancel older runs when a newer commit supersedes them. Runs triggered by pushes to `main` are not cancelled, preserving a complete evidence trail for merged commits.

The workflows use current GitHub-maintained action majors (`checkout@v6`, `setup-node@v6`, and `upload-artifact@v6` where applicable).

## Run locally

Requirements:

- Node.js 20 or newer;
- a Chromium-compatible browser for the browser E2E test.

```bash
npm install
npm test
REQUIRE_BROWSER=1 npm run test:browser
```

Generate a consolidated Allure report:

```bash
npm run test:allure
npm run report:allure
npx allure open allure-report
```

Generate traceable comparison evidence:

```bash
npm run compare:layers
```

The comparison produces Markdown, JSON, and raw TAP logs under `reports/test-layer-comparison/`. It records timing statistics, result counts, environment metadata, and SHA-256 hashes of the exact test files used.

## Evidence guide

See [CI, Allure, and comparison evidence](docs/ci-evidence.md) for the workflow map, report instructions, comparison protocol, traceability rules, and interpretation limits.

See [Dominant Test-Layer Configuration](docs/quote-pricing/dominant-configuration.md) for the measured mutation lattice, exclusive guardians, controls, pruning rules, and final decision.
