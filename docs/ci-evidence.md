# CI, Allure, mutation, and comparison evidence

## Independent GitHub Actions

The repository exposes each quality signal as an independent workflow so failures remain attributable:

| Workflow | Scope | Primary evidence |
|---|---|---|
| Quality Checks | JavaScript syntax | Action log |
| Unit Tests | Domain rules and boundaries | Raw log + Allure results + Allure HTML |
| Integration Tests | HTTP contract and authorization | Raw log + Allure results + Allure HTML |
| System E2E Tests | Composed application through HTTP | Raw log + Allure results + Allure HTML |
| Browser E2E Tests | Real browser, DOM, JavaScript, and network wiring | Raw log + Allure results + Allure HTML |
| Consolidated Allure Report | All test layers in one launch | Combined raw log + Allure results + Allure HTML |
| Mutation Testing | Automated mutants + realistic mutant lattice + benign controls | JSON + Markdown + CSV + raw logs |
| Test Layer Comparison | Runtime and traceability comparison | Markdown + JSON + raw TAP logs |
| Evidence Pages | Verified public evidence bundle | Runtime + mutation + Allure + dashboard |

## Allure and mutation are different result models

Allure reports test executions. The mutation runners report mutant outcomes. A mutant is not represented as a normal test case because `killed` and `survived` have different semantics from `passed` and `failed`.

The mutation JSON contracts record:

- mutant ID and description;
- mutation operator and source file;
- killed/survived status;
- killing test layer for the realistic panel;
- duration and raw log path;
- commit and generation timestamp.

This keeps the data suitable for an Allure attachment or future Allure 3 plugin without corrupting the test-result model.

## Opening an Allure report

1. Open the relevant GitHub Actions run.
2. Download the evidence artifact.
3. Extract the archive.
4. Open `allure-report/index.html` through a local static server or regenerate it from `allure-results`.

```bash
npm install
npm run report:allure
npx allure open allure-report
```

## Mutation protocol

Run the automated smoke:

```bash
npm run mutation:automated
```

It first verifies a green `npm run test` baseline, applies one deterministic mutant at a time, runs `npm run test`, restores the source in a `finally` block, and writes evidence under `reports/mutation/`.

Run the realistic layer audit:

```bash
npm run audit:manual
```

For each of 12 production-style mutants, the audit runs unit, integration, and system E2E independently and records the killing layers. It also applies two equivalent refactor controls that must survive every audited decision layer. The script fails if the observed detection matrix or seven-arm lattice no longer matches the documented baseline.

Generated files include:

```text
reports/mutation/
├── automated-mutation.json
├── automated-mutation.md
├── manual-mutant-panel.json
├── manual-mutant-panel.md
├── manual-mutant-panel.csv
└── raw/
    ├── automated/
    └── manual/
```

The dedicated real-browser smoke remains an independent fourth execution layer. It is not folded into the historical three-layer mutation lattice, so the decision model stays comparable to the original experiment.

## Runtime comparison protocol

The comparison workflow executes every layer independently using the same runner and commit. The default protocol uses one warmup and five measured executions per layer, retains TAP evidence, records test-file SHA-256 hashes, and reports median, p95, minimum, maximum, and relative runtime cost.

Generated files:

```text
reports/test-layer-comparison/
├── comparison.md
├── comparison.json
└── raw/
    ├── unit-warmup-01.tap
    ├── unit-run-01.tap
    ├── integration-run-01.tap
    ├── e2e-run-01.tap
    └── browser-run-01.tap
```

## Evidence interpretation

Runtime is not equivalent to defect-detection capability. A faster layer must not replace another layer only because it is cheaper. Mutation evidence answers which demonstrated defect classes would be lost; runtime evidence answers what the layer costs under the recorded protocol.

All measurements and mutation conclusions are scoped to the repository commit, test data, runner, runtime, browser boundary, and mutant panel that produced them.

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
npm run mutation:evidence
npm run compare:layers
```
