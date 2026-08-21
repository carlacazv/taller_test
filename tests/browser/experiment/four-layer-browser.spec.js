import { test, expect } from "../fixtures/quote.fixture.js";

test.describe("Four-layer experiment: browser-exclusive risks", () => {
  test("page exposes the accessible quote composition", async ({ quotePage }) => {
    await quotePage.open();
    await expect(quotePage.heading).toBeVisible();
    await expect(quotePage.planSelect).toHaveValue("standard");
    await expect(quotePage.quantityInput).toHaveValue("2");
    await expect(quotePage.calculateButton).toBeEnabled();
    await expect(quotePage.result).toHaveText("Submit the form to calculate a quote.");
  });

  test("URL state hydrates plan and quantity", async ({ quotePage }) => {
    await quotePage.open({ plan: "premium", quantity: 3 });
    await expect(quotePage.planSelect).toHaveValue("premium");
    await expect(quotePage.quantityInput).toHaveValue("3");
  });

  test("URL autorun executes browser JavaScript and renders the total", async ({ quotePage }) => {
    await quotePage.open({ plan: "premium", quantity: 2, autorun: true });
    await expect(quotePage.result).toHaveText("Total: $118.80");
  });

  test("submit wiring calls the quote endpoint as a member and renders total", async ({ page, quotePage }) => {
    await quotePage.open();
    const requestPromise = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/quote");

    await quotePage.calculate({ plan: "standard", quantity: 1 });

    const request = await requestPromise;
    expect(request.headers()["x-role"]).toBe("member");
    await expect(quotePage.result).toHaveText("Total: $52.00");
  });
});
