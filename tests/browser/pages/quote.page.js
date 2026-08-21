export class QuotePage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole("heading", {
      level: 1,
      name: "TRIMS Quote Lab",
      exact: true
    });
    this.description = page.getByText(
      "Compare automation seams using a small pricing workflow.",
      { exact: true }
    );
    this.planSelect = page.getByLabel("Plan", { exact: true });
    this.quantityInput = page.getByLabel("Quantity", { exact: true });
    this.calculateButton = page.getByRole("button", {
      name: "Calculate quote",
      exact: true
    });
    this.result = page.getByRole("status", {
      name: "Quote result",
      exact: true
    });
  }

  async open({ plan, quantity, autorun = false } = {}) {
    const query = new URLSearchParams();

    if (plan !== undefined) query.set("plan", String(plan));
    if (quantity !== undefined) query.set("quantity", String(quantity));
    if (autorun) query.set("autorun", "1");

    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    await this.page.goto(`/${suffix}`);
  }

  async fillQuote({ plan, quantity }) {
    await this.planSelect.selectOption(plan);
    await this.quantityInput.fill(String(quantity));
  }

  async submit() {
    await this.calculateButton.click();
  }

  async calculate(quote) {
    await this.fillQuote(quote);
    await this.submit();
  }
}
