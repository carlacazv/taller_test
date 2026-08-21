import { test, expect } from "../fixtures/quote.fixture.js";

test.describe("Quote browser resilience", { tag: ["@browser-e2e", "@resilience"] }, () => {
  test("renders the real backend authorization error when the request is unauthorized", async ({
    page,
    quotePage
  }) => {
    await page.route("**/api/quote**", async (route) => {
      await route.continue({
        headers: {
          ...route.request().headers(),
          "x-role": "guest"
        }
      });
    });

    await quotePage.open();
    await quotePage.calculate({ plan: "standard", quantity: 1 });

    await expect(quotePage.result).toHaveText("A member or admin role is required");
  });

  test("browser validation blocks invalid quantity before any API request", async ({
    page,
    quotePage
  }) => {
    const apiRequests = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/quote") {
        apiRequests.push(request.url());
      }
    });

    await quotePage.open();
    await quotePage.fillQuote({ plan: "standard", quantity: 0 });

    expect(
      await quotePage.quantityInput.evaluate((element) => element.checkValidity())
    ).toBe(false);

    await quotePage.submit();

    await expect(quotePage.result).toHaveText("Submit the form to calculate a quote.");
    expect(apiRequests).toHaveLength(0);
  });
});
