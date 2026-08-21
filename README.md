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

Expected project URL after GitHub Pages is enabled with **Settings → Pages → Source: GitHub Actions**:

`https://carlacazv.github.io/test-layer-lab/`

## Test layers

| Layer | Test boundary | Command |
|---|---|---|
| Unit | Domain calculations, validation, and boundary values | `npm run test:unit` |
| Integration | HTTP contract, authorization, and error payloads | `npm run test:integration` |
| System E2E | Composed application through its public HTTP boundary | `npm run test:e2e` |
| Browser E2E | DOM execution, client JavaScript, and network wiring | `REQUIRE_BROWSER=1 npm run test:browser` |

Each execution layer has an independent GitHub Actions workflow. Test workflows publish raw logs, Allure result files, and Allure HTML evidence even when tests fail.

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
- a Chromium-compatible browser for the browser E2E test.

```bash
npm install
npm test
REQUIRE_BROWSER=1 npm run test:browser
npm run mutation:evidence
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
