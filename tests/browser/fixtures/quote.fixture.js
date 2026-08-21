import { test as base, expect } from "@playwright/test";
import { QuotePage } from "../pages/quote.page.js";

export const test = base.extend({
  quotePage: async ({ page }, use) => {
    await use(new QuotePage(page));
  }
});

export { expect };
