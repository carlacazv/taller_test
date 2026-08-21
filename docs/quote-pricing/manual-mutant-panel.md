# Realistic Mutant Panel

## Purpose

Reproduce the original test-layer decision lattice from executable evidence rather than a static table.

## Command

```bash
npm run audit:manual
```

The audit verifies green unit, integration, and system E2E baselines, applies each candidate mutation one at a time, runs every decision layer independently, restores the source, and compares the observed killing layers with the expected matrix.

## Expected matrix

| Mutant | Expected killing layer(s) |
|---|---|
| M01 | unit, integration, system E2E |
| M02 | unit, integration, system E2E |
| M03 | unit |
| M04 | unit |
| M05 | unit, integration, system E2E |
| M06 | unit |
| M07 | integration, system E2E |
| M08 | integration |
| M09 | integration, system E2E |
| M10 | integration, system E2E |
| M11 | system E2E |
| M12 | system E2E |

This yields the reproducible lattice:

- unit: 6/12;
- integration: 7/12;
- system E2E: 8/12;
- unit + integration: 10/12;
- unit + E2E: 11/12;
- integration + E2E: 9/12;
- all three decision layers: 12/12.

Exclusive guardians are `M03`, `M04`, `M06` for unit, `M08` for integration, and `M11`, `M12` for system E2E.

## Benign controls

Two equivalent refactors (`C01`, `C02`) must survive every audited decision layer. If a control is killed, the audit fails because the suite is reacting to a harmless implementation change rather than only to meaningful behavior changes.

## Browser boundary

The real-browser smoke remains a separate fourth execution layer. It is intentionally not folded into this historical three-layer decision lattice; its own workflow validates DOM execution, client JavaScript, and the live network seam.

## Evidence

The command writes JSON, Markdown, CSV, and raw per-layer logs under `reports/mutation/`.
