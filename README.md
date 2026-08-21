# Test Layer Lab

[![Quality Checks](https://github.com/carlacazv/test-layer-lab/actions/workflows/quality-checks.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/quality-checks.yml)
[![Unit Tests](https://github.com/carlacazv/test-layer-lab/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/unit-tests.yml)
[![Integration Tests](https://github.com/carlacazv/test-layer-lab/actions/workflows/integration-tests.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/integration-tests.yml)
[![System E2E Tests](https://github.com/carlacazv/test-layer-lab/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/e2e-tests.yml)
[![Browser E2E Tests](https://github.com/carlacazv/test-layer-lab/actions/workflows/browser-tests.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/browser-tests.yml)
[![Allure Report](https://github.com/carlacazv/test-layer-lab/actions/workflows/allure-report.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/allure-report.yml)
[![Mutation Testing](https://github.com/carlacazv/test-layer-lab/actions/workflows/mutation-testing.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/mutation-testing.yml)
[![Test Layer Comparison](https://github.com/carlacazv/test-layer-lab/actions/workflows/test-layer-comparison.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/test-layer-comparison.yml)
[![Evidence Pages](https://github.com/carlacazv/test-layer-lab/actions/workflows/evidence-pages.yml/badge.svg)](https://github.com/carlacazv/test-layer-lab/actions/workflows/evidence-pages.yml)

An evidence-driven JavaScript laboratory for comparing unit, HTTP integration, system E2E, and real-browser E2E test layers.

The project measures two different questions separately:

1. **Execution cost:** how expensive is each layer under the same protocol?
2. **Detection effectiveness:** which realistic defects become uncovered when a layer is removed?

Runtime alone is never treated as evidence that a test layer is unnecessary.

## Evidence dashboard

The GitHub Pages dashboard is built only after the test, runtime, and mutation evidence for the exact commit has been regenerated successfully. It embeds the consolidated Allure report and publishes machine-readable mutation and runtime artifacts alongside it.

Project URL:

`https://carlacazv.github.io/test-layer-lab/`

## Test layers

| Layer | Test boundary | Command |
|---|---|---|
| Unit | Domain calculations, validation, and boundary values | `npm run test:unit` |
| Integration | HTTP contract, authorization, and error payloads | `npm run test:integration` |
| System E2E | Composed application through its public HTTP boundary | `npm run test:e2e` |
| Browser E2E | Playwright-driven DOM execution, client JavaScript, browser validation, and network wiring | `npm run test:browser` |

Each execution layer has an independent GitHub Actions workflow. Test workflows preserve raw logs and report evidence even when tests fail.

## Playwright browser E2E architecture

The browser layer uses `@playwright/test` with a deliberately small Page Object Model rather than putting selectors and workflow logic directly in spec files.

```text
tests/browser/
├── data/
│   └── quote-cases.js
├── fixtures/
│   └── quote.fixture.js
├── pages/
│   └── quote.page.js
└── specs/
    ├── quote-calculation.spec.js
    ├── quote-contract.spec.js
    ├── quote-navigation.spec.js
    └── quote-resilience.spec.js
```

The locator policy is accessibility-first:

1. `getByRole` for interactive and semantic elements;
2. `getByLabel` for form controls;
3. stable user-visible text when it represents product behavior;
4. test IDs only when no meaningful user-facing contract exists;
5. no XPath or CSS selectors tied to DOM layout.

Page Objects own locators and reusable actions. Assertions stay in specs so test intent remains explicit. CI enables `forbidOnly`, flaky-test failure, retries for diagnostics, and Playwright trace/screenshot/video retention on failure.

See [Playwright browser E2E architecture](docs/playwright-e2e.md).

## Mutation testing

Mutation evidence is reproducible from the current repository state instead of being a historical dashboard claim.

```bash
npm run mutation:automated
npm run audit:manual
# or both
npm run mutation:evidence
```

The automated smoke applies eight deterministic mutants and runs the non-browser suite against each one. The realistic panel applies 12 production-style mutants plus two benign refactor controls, executes unit, integration, and system E2E independently, and verifies the documented seven-arm lattice:

| Configuration | Expected detection |
|---|---:|
| Unit only | 6/12 |
| Integration only | 7/12 |
| System E2E only | 8/12 |
| Unit + Integration | 10/12 |
| Unit + E2E | 11/12 |
| Integration + E2E | 9/12 |
| Unit + Integration + E2E | 12/12 |

Generated evidence is written under `reports/mutation/` as JSON, Markdown, CSV, and raw per-mutant logs. The mutation workflow uploads those files as a reproducibility artifact.

### Allure compatibility boundary

Allure remains the test-execution report. Mutation results are **not** emitted as fake Allure test cases. They use a separate mutation result contract containing mutant identity, operator, source file, killed/survived status, killing layer, duration, and traceable logs. This keeps the semantics correct while leaving a clean path for attachments or a future Allure 3 plugin.

See [Mutation evidence and Allure compatibility](docs/quote-pricing/mutation-allure-compatibility.md).

## CI evidence preservation

Pull-request workflows cancel older runs when a newer commit supersedes them. Runs triggered by pushes to `main` are not cancelled, preserving a complete evidence trail for merged commits.

## Run locally

Requirements:

- Node.js 20 or newer;
- Playwright Chromium installed locally.

```bash
npm install
npx playwright install chromium
npm test
npm run test:browser
npm run mutation:evidence
```

Useful Playwright commands:

```bash
npm run test:browser:ui
npm run test:browser:debug
```

Generate a consolidated Allure report:

```bash
npm run test:allure
npm run report:allure
npx allure open allure-report
```

Generate traceable runtime comparison evidence:

```bash
npm run compare:layers
```

## Evidence guide

See [CI, Allure, mutation, and comparison evidence](docs/ci-evidence.md) for workflow and artifact details.

See [Dominant Test-Layer Configuration](docs/quote-pricing/dominant-configuration.md) for the measured mutation lattice, exclusive guardians, controls, pruning rules, and final decision.
