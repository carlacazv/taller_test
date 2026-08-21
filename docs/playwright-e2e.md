# Playwright browser E2E architecture

## Purpose

The browser suite proves risks that the system-level HTTP tests cannot prove on their own: real DOM execution, client-side JavaScript, browser validation, URL-driven state, and the final browser-to-server request contract.

The suite is intentionally organized so selectors, reusable browser behavior, scenario data, and assertions have different owners.

## Structure

```text
playwright.config.js

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

### Page Objects

Page Objects expose semantic locators and user-level actions. They do not contain business assertions.

This keeps specs readable:

```js
await quotePage.open();
await quotePage.calculate({ plan: "premium", quantity: 2 });
await expect(quotePage.result).toHaveText("Total: $118.80");
```

The assertion belongs to the spec because it explains why the scenario exists. The Page Object only knows how the user interacts with the page.

### Fixtures

Fixtures construct Page Objects once per isolated Playwright test context. Specs import the project fixture instead of creating page objects repeatedly.

### Scenario data

Reusable business inputs live under `data/`. Parameterized calculation scenarios stay independent from page mechanics.

## Locator policy

Use locators that represent the contract a user or assistive technology observes.

Preferred order:

1. `getByRole()` with an accessible name;
2. `getByLabel()` for form controls;
3. stable text that is itself part of the product behavior;
4. `getByTestId()` only when the product has no meaningful accessible/user-facing contract.

Avoid:

- XPath;
- CSS chains such as `.card > div:nth-child(2)`;
- generated classes;
- indexes such as `locator(...).nth(3)` when the element has a semantic identity;
- selectors based on styling or layout.

The quote result is explicitly exposed as an accessible `status` named `Quote result`, so the browser suite can target its semantic contract rather than `#result`.

## Test-design rules

- One scenario should explain one observable risk.
- Specs may call several Page Object actions, but they should not hide the expected behavior inside the Page Object.
- Do not use `page.waitForTimeout()` as synchronization.
- Prefer Playwright web-first assertions because they retry against the live page state.
- Network observation is allowed when the browser-to-server contract is itself the behavior under test.
- Network routing is used only to create a state that is otherwise unreachable through the small demo UI, such as forcing the real backend authorization error path.
- Tests must remain isolated and safe to run in parallel.

## Current browser risks covered

The Playwright suite currently validates:

- accessible page composition and safe default state;
- standard pricing below the free-shipping threshold;
- premium discount plus free shipping;
- the inclusive free-shipping boundary;
- URL-driven plan and quantity hydration;
- URL `autorun` across the full browser-to-server flow;
- HTTP method, query parameters, and member-role header sent by the browser;
- rendering of the real backend authorization error;
- native browser validation preventing an invalid quantity from reaching the API.

## Failure evidence

CI installs Playwright-managed Chromium rather than relying on a preinstalled runner browser. On failure the browser layer retains:

- Playwright trace;
- screenshot;
- video;
- raw execution log;
- Playwright HTML report;
- Allure results and Allure HTML report.

`forbidOnly` and `failOnFlakyTests` are enabled in CI. A retry is allowed for diagnosis, but a test that passes only on retry is still treated as a CI failure.

## Commands

```bash
npm install
npx playwright install chromium
npm run test:browser
npm run test:browser:ui
npm run test:browser:debug
npm run test:browser:allure
```
