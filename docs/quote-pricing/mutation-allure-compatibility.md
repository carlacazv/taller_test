# Mutation Evidence and Allure Compatibility

## The modeling problem

A normal test execution and a mutation result are related but not equivalent.

A test result answers questions such as:

- did this test pass, fail, break, or skip?;
- how long did it run?;
- what labels, steps, and attachments belong to it?

A mutation result answers different questions:

- which production change was injected?;
- did the test suite kill or allow that change to survive?;
- which test layer killed it?;
- is it a realistic defect or a benign control?;
- what does the result imply about architecture and coverage?

Mapping `killed` to `passed` or `survived` to `failed` would lose those semantics and could make the Allure report misleading.

## Current integration boundary

The repository therefore keeps two evidence streams:

```text
Tests
  -> allure-results/
  -> Allure HTML report

Mutation audit
  -> reports/mutation/*.json
  -> reports/mutation/*.md
  -> reports/mutation/*.csv
  -> reports/mutation/raw/*.log
```

They are generated from the same commit and published together by Evidence Pages, but they remain distinct result models.

## Mutation result contract

The JSON evidence includes fields suitable for a future reporting adapter:

- schema version and result kind;
- repository commit and generation timestamp;
- mutant ID, description, operator, and source file;
- `killed` / `survived` status;
- killing layer(s) for the realistic panel;
- execution duration;
- raw log location;
- lattice and benign-control summaries.

## Allure-compatible extension options

Without changing the semantics, the mutation evidence can later be integrated in one of three ways:

1. attach the JSON/Markdown summary to an existing Allure launch;
2. add links from the Allure report to the mutation evidence published for the same commit;
3. build an Allure 3 plugin that reads the mutation contract and renders a dedicated mutation view.

The third option is the cleanest if native navigation, mutation score, killed/survived filtering, and layer guardians are desired.

## Design rule

Do not manufacture ordinary Allure test cases merely to make mutation results visible. Preserve the mutation model first, then adapt the presentation layer.
