# Automated Mutation Protocol

## Purpose

Provide a small, deterministic mutation smoke that can be reproduced on every commit without external mutation-testing dependencies.

## Command

```bash
npm run mutation:automated
```

The runner first requires a green `npm run test` baseline. It then applies eight single-source mutations one at a time, executes the non-browser test suite, records the result, and restores the source in a `finally` block before continuing.

## Mutants

| ID | Intent | Source boundary |
|---|---|---|
| A01 | premium price drift | domain |
| A02 | discount-rate drift | domain |
| A03 | free-shipping boundary mutation | domain |
| A04 | shipping-fee drift | domain |
| A05 | quantity boundary mutation | domain |
| A06 | authorization removal | application |
| A07 | request quantity mapping defect | HTTP |
| A08 | client endpoint wiring defect | web composition |

The workflow requires all eight mutants to be killed. A surviving mutant makes the command fail.

## Evidence contract

Generated artifacts:

- `reports/mutation/automated-mutation.json`;
- `reports/mutation/automated-mutation.md`;
- `reports/mutation/raw/automated/*.log`.

The JSON uses mutation semantics (`killed` / `survived`) and is deliberately separate from `allure-results`.
