import { test, expect } from "../fixtures/quote.fixture.js";

test.describe("Four-layer experiment: UI API overlap", () => {
  test("browser request preserves query mapping, member role, and server total", async ({ page, quotePage }) => {
    await quotePage.open();
    const requestPromise = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/quote");

    await quotePage.calculate({ plan: "standard", quantity: 1 });

    const request = await requestPromise;
    const url = new URL(request.url());
    expect(request.method()).toBe("GET");
    expect(url.searchParams.get("plan")).toBe("standard");
    expect(url.searchParams.get("quantity")).toBe("1");
    expect(request.headers()["x-role"]).toBe("member");
    await expect(quotePage.result).toHaveText("Total: $52.00");
  });

  test("authorization failure from the real backend is rendered", async ({ page, quotePage }) => {
    await page.route("**/api/quote**", async (route) => {
      await route.continue({
        headers: { ...route.request().headers(), "x-role": "guest" }
      });
    });

    await quotePage.open();
    await quotePage.calculate({ plan: "standard", quantity: 1 });
    await expect(quotePage.result).toHaveText("A member or admin role is required");
  });
});
