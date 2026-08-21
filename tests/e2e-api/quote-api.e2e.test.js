import test from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../../src/server.js";

async function withServer(run) {
  const { server, origin } = await startServer();
  try {
    await run(origin);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function requestQuote(origin, { plan, quantity, role = "member" }) {
  const headers = role === null ? {} : { "x-role": role };
  return fetch(`${origin}/api/quote?plan=${encodeURIComponent(plan)}&quantity=${encodeURIComponent(quantity)}`, { headers });
}

test("standard quote completes through the deployed API boundary", async () => {
  await withServer(async (origin) => {
    const response = await requestQuote(origin, { plan: "standard", quantity: 1 });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      quote: { unitPrice: 40, quantity: 1, subtotal: 40, discount: 0, shipping: 8, tax: 4, total: 52 }
    });
  });
});

test("premium quote applies discount through the deployed API boundary", async () => {
  await withServer(async (origin) => {
    const response = await requestQuote(origin, { plan: "premium", quantity: 2 });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      quote: { unitPrice: 60, quantity: 2, subtotal: 120, discount: 12, shipping: 0, tax: 10.8, total: 118.8 }
    });
  });
});

test("free-shipping boundary remains inclusive through the deployed API", async () => {
  await withServer(async (origin) => {
    const response = await requestQuote(origin, { plan: "standard", quantity: 2 });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).quote.total, 88);
  });
});

test("invalid quantity is rejected through the deployed API", async () => {
  await withServer(async (origin) => {
    const response = await requestQuote(origin, { plan: "standard", quantity: 0 });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Quantity must be a positive integer" });
  });
});

test("unsupported plan is rejected through the deployed API", async () => {
  await withServer(async (origin) => {
    const response = await requestQuote(origin, { plan: "enterprise", quantity: 1 });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Plan must be standard or premium" });
  });
});

test("guest authorization is enforced through the deployed API", async () => {
  await withServer(async (origin) => {
    const response = await requestQuote(origin, { plan: "standard", quantity: 1, role: null });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "A member or admin role is required" });
  });
});
