import { test, expect } from "../fixtures/quote.fixture.js";

test.describe("Quote page navigation and state", { tag: ["@browser-e2e", "@quote"] }, () => {
  test("loads the accessible quote form with safe defaults", async ({ quotePage }) => {
    await quotePage.open();

    await expect(quotePage.heading).toBeVisible();
    await expect(quotePage.description).toBeVisible();
    await expect(quotePage.planSelect).toHaveValue("standard");
    await expect(quotePage.quantityInput).toHaveValue("2");
    await expect(quotePage.calculateButton).toBeEnabled();
    await expect(quotePage.result).toHaveText("Submit the form to calculate a quote.");
  });

  test("hydrates plan and quantity from URL parameters without submitting", async ({ quotePage }) => {
    await quotePage.open({ plan: "premium", quantity: 3 });

    await expect(quotePage.planSelect).toHaveValue("premium");
    await expect(quotePage.quantityInput).toHaveValue("3");
    await expect(quotePage.result).toHaveText("Submit the form to calculate a quote.");
  });

  test("autorun executes the full browser-to-server flow from URL state", async ({ quotePage }) => {
    await quotePage.open({ plan: "premium", quantity: 2, autorun: true });

    await expect(quotePage.result).toHaveText("Total: $118.80");
  });
});
