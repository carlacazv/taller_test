import { test, expect } from "../fixtures/quote.fixture.js";

const cases = [
  { name: "standard below free shipping threshold", plan: "standard", quantity: 1, total: 52 },
  { name: "premium discount and free shipping", plan: "premium", quantity: 2, total: 118.8 },
  { name: "inclusive free shipping boundary", plan: "standard", quantity: 2, total: 88 }
];

test.describe("Four-layer experiment: UI domain overlap", () => {
  for (const scenario of cases) {
    test(scenario.name, async ({ quotePage }) => {
      await quotePage.open();
      await quotePage.calculate(scenario);
      await expect(quotePage.result).toHaveText(`Total: $${scenario.total.toFixed(2)}`);
    });
  }

  test("backend still rejects zero when browser constraint is bypassed", async ({ quotePage }) => {
    await quotePage.open();
    await quotePage.quantityInput.evaluate((input) => input.removeAttribute("min"));
    await quotePage.fillQuote({ plan: "standard", quantity: 0 });
    await quotePage.submit();
    await expect(quotePage.result).toHaveText("Quantity must be a positive integer");
  });
});
