import { test, expect } from "../fixtures/quote.fixture.js";

test.describe("Quote browser-to-HTTP contract", { tag: ["@browser-e2e", "@contract"] }, () => {
  test("submits the expected request method, query parameters, and role header", async ({
    page,
    quotePage
  }) => {
    await quotePage.open();

    const requestPromise = page.waitForRequest((request) => {
      return new URL(request.url()).pathname === "/api/quote";
    });

    await quotePage.calculate({ plan: "premium", quantity: 2 });

    const request = await requestPromise;
    const requestUrl = new URL(request.url());

    expect(request.method()).toBe("GET");
    expect(requestUrl.searchParams.get("plan")).toBe("premium");
    expect(requestUrl.searchParams.get("quantity")).toBe("2");
    expect(request.headers()["x-role"]).toBe("member");
    await expect(quotePage.result).toHaveText("Total: $118.80");
  });
});
