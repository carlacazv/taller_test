# TRIMS Mutation Layer Lab

[![Quality Checks](https://github.com/carlacazv/taller_test/actions/workflows/quality-checks.yml/badge.svg)](https://github.com/carlacazv/taller_test/actions/workflows/quality-checks.yml)
[![Unit Tests](https://github.com/carlacazv/taller_test/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/carlacazv/taller_test/actions/workflows/unit-tests.yml)
[![Integration Tests](https://github.com/carlacazv/taller_test/actions/workflows/integration-tests.yml/badge.svg)](https://github.com/carlacazv/taller_test/actions/workflows/integration-tests.yml)
[![System E2E Tests](https://github.com/carlacazv/taller_test/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/carlacazv/taller_test/actions/workflows/e2e-tests.yml)
[![Browser E2E Tests](https://github.com/carlacazv/taller_test/actions/workflows/browser-tests.yml/badge.svg)](https://github.com/carlacazv/taller_test/actions/workflows/browser-tests.yml)
[![Allure Report](https://github.com/carlacazv/taller_test/actions/workflows/allure-report.yml/badge.svg)](https://github.com/carlacazv/taller_test/actions/workflows/allure-report.yml)
[![Test Layer Comparison](https://github.com/carlacazv/taller_test/actions/workflows/test-layer-comparison.yml/badge.svg)](https://github.com/carlacazv/taller_test/actions/workflows/test-layer-comparison.yml)

An empirical JavaScript laboratory for comparing unit, HTTP integration, system E2E, and real-browser E2E test layers.

## Test layers

| Layer | Test boundary | Command |
|---|---|---|
| Unit | Domain calculations, validation, and boundary values | `npm run test:unit` |
| Integration | HTTP contract, authorization, and error payloads | `npm run test:integration` |
| System E2E | Composed application through its public HTTP boundary | `npm run test:e2e` |
| Browser E2E | DOM execution, client JavaScript, and network wiring | `REQUIRE_BROWSER=1 npm run test:browser` |

Each layer has an independent GitHub Actions workflow. Test workflows publish raw logs, Allure result files, and an Allure HTML report even when the tests fail.

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
npx serve allure-report
```

Generate traceable comparison evidence:

```bash
npm run compare:layers
```

The comparison produces Markdown, JSON, and raw TAP logs under `reports/test-layer-comparison/`. It records timing statistics, result counts, environment metadata, and SHA-256 hashes of the exact test files used.

## Evidence guide

See [CI, Allure, and comparison evidence](docs/ci-evidence.md) for the workflow map, report instructions, comparison protocol, traceability rules, and interpretation limits.
