# CI, Allure, and comparison evidence

## Independent GitHub Actions

The repository exposes each quality signal as an independent workflow so failures are visible without opening a monolithic job:

| Workflow | Scope | Primary evidence |
|---|---|---|
| Quality Checks | JavaScript syntax | Action log |
| Unit Tests | Domain rules and boundaries | Raw log + Allure results + Allure HTML |
| Integration Tests | HTTP contract and authorization | Raw log + Allure results + Allure HTML |
| System E2E Tests | Composed application through HTTP | Raw log + Allure results + Allure HTML |
| Browser E2E Tests | Real browser, DOM, JavaScript, and network wiring | Raw log + Allure results + Allure HTML |
| Consolidated Allure Report | All test layers in one launch | Combined raw log + Allure results + Allure HTML |
| Test Layer Comparison | Runtime and traceability comparison | Markdown + JSON + raw TAP logs |

Every test workflow uploads evidence even when a test fails. The workflow only returns the final failure after report generation and artifact upload.

## Opening an Allure report

1. Open the relevant GitHub Actions run.
2. Download the evidence artifact at the bottom of the run summary.
3. Extract the archive.
4. Open `allure-report/index.html` through a local static server, for example:

```bash
npx serve allure-report
```

The `allure-results` directory is also retained so the report can be regenerated with:

```bash
npm install
npm run report:allure
```

## Comparison protocol

The comparison workflow executes every layer independently using the same runner and commit.

Default protocol:

- one warmup execution per layer;
- five measured executions per layer;
- TAP output retained for every measured execution;
- median, p95, minimum, maximum, and relative runtime cost calculated;
- test count and pass/fail/skip totals collected;
- SHA-256 recorded for every test file used in the comparison;
- browser execution required rather than silently skipped.

Generated files:

```text
reports/test-layer-comparison/
├── comparison.md
├── comparison.json
└── raw/
    ├── unit-run-01.tap
    ├── integration-run-01.tap
    ├── e2e-run-01.tap
    └── browser-run-01.tap
```

The Markdown table is also written to the GitHub Actions Job Summary, making the comparison visible without downloading the artifact.

## Evidence interpretation

Runtime is not equivalent to defect-detection capability. A faster layer must not replace another layer only because it is cheaper. The comparison must be read together with the assertions and test purpose:

- unit tests protect calculations, validation, and boundary values;
- integration tests protect the real HTTP contract and authorization seam;
- system E2E tests protect composed application behavior;
- browser E2E tests protect client-side execution and browser-to-server wiring.

All timings are specific to the commit, runner, runtime, test data, and execution protocol recorded in `comparison.json`.

## Local commands

```bash
npm install
npm run check
npm run test:unit
npm run test:integration
npm run test:e2e
REQUIRE_BROWSER=1 npm run test:browser
npm run test:allure
npm run report:allure
npm run compare:layers
```

To increase the comparison sample:

```bash
COMPARISON_WARMUPS=2 COMPARISON_ITERATIONS=10 npm run compare:layers
```
