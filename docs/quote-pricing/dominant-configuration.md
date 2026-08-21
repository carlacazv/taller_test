# Dominant Test-Layer Configuration

## Decision

Retain the complete test-layer set for the quote-pricing bucket:

- unit tests;
- HTTP integration tests;
- system E2E tests;
- a focused real-browser composition smoke.

The three-layer mutation decision lattice reaches its ceiling only with unit + integration + system E2E: **12/12 realistic production mutants detected**. The browser smoke remains a separate fourth execution boundary protecting real DOM/client/network execution.

## Reproducible comparative result

`npm run audit:manual` now regenerates the detection counts below from the current source instead of relying on historical prose:

| Configuration | Detection | Historical warm median | Relative cost | Verdict |
|---|---:|---:|---:|---|
| unit only | 6/12 | 155.39 ms | 1.00x | rejected |
| integration only | 7/12 | 220.62 ms | 1.42x | rejected |
| E2E only | 8/12 | 187.60 ms | 1.21x | rejected |
| unit + integration | 10/12 | 371.51 ms | 2.39x | rejected |
| unit + E2E | 11/12 | 330.97 ms | 2.13x | rejected |
| integration + E2E | 9/12 | 412.67 ms | 2.66x | rejected |
| **unit + integration + E2E** | **12/12** | **552.41 ms** | **3.55x** | **dominant** |

The detection column is enforced by the current mutation runner. The timing column is the historical warm benchmark and is evaluated separately from detection effectiveness.

## Exclusive guardians

### Unit

- `M03`: inclusive free-shipping boundary;
- `M04`: approved shipping fee;
- `M06`: positive-integer quantity validation.

### Integration

- `M08`: authorization guard removal at the application/HTTP seam.

### System E2E

- `M11`: page composition loses the primary heading;
- `M12`: browser wiring calls the wrong endpoint.

Removing any complete decision layer leaves at least one demonstrated defect class undetected.

## Controls and confidence

Current reproducible checks:

- automated deterministic mutation smoke: **8 mutants**, all required to be killed;
- realistic production-style panel: **12 mutants**, all required to be detected by the complete decision-layer set;
- benign refactor controls: **2 controls**, both required to survive unit, integration, and system E2E;
- a dedicated real-browser smoke remains independently executed;
- CI uploads JSON, Markdown, CSV, and raw per-mutant logs.

If any expected mutant survives, any benign control is killed, or any lattice count changes, the mutation workflow fails rather than publishing the old result as if it were current.

## Allure boundary

Allure remains the execution report for tests. Mutation evidence is intentionally separate and uses `killed`/`survived` semantics. The mutation JSON can be attached to Allure or consumed by a future Allure 3 plugin, but mutants are not emitted as fake test cases.

See [Mutation evidence and Allure compatibility](mutation-allure-compatibility.md).

## Quality-first pruning order

A future optimization must follow this order:

1. identify the expensive check and the realistic mutant class it guards;
2. add a cheaper compensating test that independently kills that mutant;
3. rerun the complete protocol, benign controls, mutation score, and runtime benchmark;
4. remove the expensive check only when detection remains equal to the ceiling;
5. never generalize this bucket's verdict to another module without rerunning the protocol.

## Traceability

- Tracking issue: #2.
- Automated mutation definition: `scripts/run-automated-mutation.mjs`.
- Realistic panel and controls: `scripts/run-manual-mutants.mjs`.
- Mutation workflow: `.github/workflows/mutation-testing.yml`.
- Automated protocol: `docs/quote-pricing/automated-mutation.md`.
- Realistic panel protocol: `docs/quote-pricing/manual-mutant-panel.md`.
- Generated CI evidence: `reports/mutation/` inside workflow artifacts and Evidence Pages.
- Runtime comparison: `scripts/compare-test-layers.mjs` and `reports/test-layer-comparison/`.

## Final verdict

Do not remove an entire test layer from this bucket. The current dominant configuration is the smallest measured decision-layer set that preserves ceiling detection, while the real-browser smoke protects an additional execution boundary.
