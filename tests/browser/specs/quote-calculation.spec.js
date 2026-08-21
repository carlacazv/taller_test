import { test, expect } from "../fixtures/quote.fixture.js";
import { quoteCases } from "../data/quote-cases.js";

test.describe("Quote calculation", { tag: ["@browser-e2e", "@quote"] }, () => {
  for (const scenario of quoteCases) {
    test(scenario.name, async ({ quotePage }) => {
      await quotePage.open();
      await quotePage.calculate(scenario);

      await expect(quotePage.result).toHaveText(
        `Total: $${scenario.expectedTotal.toFixed(2)}`
      );
    });
  }
});
