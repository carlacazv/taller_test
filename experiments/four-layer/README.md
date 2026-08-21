# Four-layer mutation portfolio experiment

This experiment compares every non-empty combination of four test layers:

- Unit
- Integration
- E2E API
- E2E UI with Playwright

There are 15 possible portfolios. Each portfolio lives on its own branch and pull request. Experimental pull requests are evidence arms, not changes that should be merged by default. After every arm has produced comparable mutation and runtime evidence, only the winning portfolio is eligible to be merged to `main`.

## Decision protocol

The experiment uses 20 realistic mutants spanning domain rules, HTTP/application seams, and real-browser behavior, plus benign controls that must survive.

A portfolio is compared in this order:

1. maximize realistic-mutant detection;
2. among portfolios with equivalent detection, minimize measured runtime;
3. keep browser tests focused on browser-exclusive risk when cheaper selected layers already guard the same domain/API mutant classes.

This prevents a fast but weak portfolio from winning and also prevents a full Playwright suite from appearing efficient merely because it duplicates checks that can be guarded more cheaply below the UI.

## Playwright portfolio pruning

The UI-only arm intentionally runs domain-overlap, API-overlap, and browser-exclusive Playwright scenarios. That demonstrates the cost of pushing broad coverage to the UI.

Mixed arms prune duplicated UI scenarios automatically:

- Unit + UI keeps API-overlap and browser-exclusive UI scenarios.
- Integration + UI keeps domain-overlap and browser-exclusive UI scenarios.
- E2E API + UI keeps only browser-exclusive UI scenarios.
- Unit + Integration + UI and richer portfolios also keep only browser-exclusive UI scenarios when their lower layers already cover the backend mutant classes.

The pruning rule changes execution scope, not the mutation panel. Every arm is challenged by the same 20 realistic mutants.

## Evidence

Each arm produces:

```text
reports/four-layer-experiment/
├── arm-result.json
├── arm-result.md
├── arm-result.csv
└── raw/
    ├── baseline-*.log
    ├── mutants/
    └── benchmark/
```

The GitHub Actions workflow uploads the complete evidence bundle for 90 days and writes the Markdown result into the run summary.
