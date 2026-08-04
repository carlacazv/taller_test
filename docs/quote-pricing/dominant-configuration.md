# Dominant Test-Layer Configuration

## Decision

Retain the complete test-layer set for the quote-pricing bucket:

- unit;
- HTTP integration;
- system E2E;
- a focused real-browser composition smoke.

The complete configuration is the only lattice arm that preserves the ceiling result of **12/12 realistic production mutants detected**.

## Comparative result

| Configuration | Detection | Warm median | Relative cost | Verdict |
|---|---:|---:|---:|---|
| unit only | 6/12 | 155.39 ms | 1.00x | rejected |
| integration only | 7/12 | 220.62 ms | 1.42x | rejected |
| E2E only | 8/12 | 187.60 ms | 1.21x | rejected |
| unit + integration | 10/12 | 371.51 ms | 2.39x | rejected |
| unit + E2E | 11/12 | 330.97 ms | 2.13x | rejected |
| integration + E2E | 9/12 | 412.67 ms | 2.66x | rejected |
| **unit + integration + E2E** | **12/12** | **552.41 ms** | **3.55x** | **dominant** |

## Exclusive guardians

### Unit

- `M03`: inclusive free-shipping boundary;
- `M04`: approved shipping fee;
- `M06`: positive-integer quantity validation.

### Integration

- `M08`: authorization guard removal at the real HTTP seam.

### E2E

- `M11`: page composition loses the primary heading;
- `M12`: browser wiring calls the wrong endpoint.

Removing any complete layer leaves at least one realistic defect class undetected.

## Controls and confidence

- Automated mutation panel: **8/8 killed (100%)**.
- Benign refactor controls: **2/2 survived every layer**.
- Twelve-Factor audit: **11 PASS, 1 NOT_APPLICABLE, 0 FAIL**.
- Runtime and tasks are pinned through Mise.
- CI publishes TAP logs, JSON timings, Markdown evidence, mutation output and the consolidated layer comparison as downloadable artifacts.

## Quality-first pruning order

A future optimization must follow this order:

1. identify the expensive check and the realistic mutant class it guards;
2. add a cheaper compensating test that independently kills that mutant;
3. rerun the manual panel, automated mutation, lattice benchmark and benign controls;
4. remove the expensive check only when detection remains equal to the ceiling;
5. never generalize this bucket's verdict to another module without rerunning the protocol.

## Safeguards

- Measure the complete relevant unit scope; never filter only by the bucket name when neighboring tests may kill the mutant.
- Treat integration as a directed seam test, not as a substitute for unit coverage.
- Preserve browser-visible composition and real network wiring checks.
- Keep benign refactors in every panel to detect brittle tests.
- Use medians from at least five warm executions and separate local execution from CI setup cost.
- Add compensation before removal so the suite is never temporarily uncovered.

## Traceability

- Tracking issue: #3.
- Raw data: `docs/quote-pricing/raw/`.
- Manual panel: `docs/quote-pricing/manual-mutant-panel.md`.
- Automated mutation: `docs/quote-pricing/automated-mutation.md`.
- Benchmark: `docs/quote-pricing/benchmark-comparison.md`.
- Reusable skill: `.claude/skills/mutation-layer-audit/SKILL.md`.

## Final verdict

Do not remove an entire test layer from this bucket. The current dominant configuration is the smallest measured set that preserves ceiling detection.
