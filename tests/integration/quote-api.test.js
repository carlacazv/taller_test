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

test("authorized member receives the quote HTTP contract", async () => {
  await withServer(async (origin) => {
    const response = await fetch(`${origin}/api/quote?plan=premium&quantity=2`, {
      headers: { "x-role": "member" }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      quote: { unitPrice: 60, quantity: 2, subtotal: 120, discount: 12, shipping: 0, tax: 10.8, total: 118.8 }
    });
  });
});

test("guest access is denied at the HTTP seam", async () => {
  await withServer(async (origin) => {
    const response = await fetch(`${origin}/api/quote?plan=standard&quantity=1`);
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /member or admin/);
  });
});

test("unsupported plans return a client error", async () => {
  await withServer(async (origin) => {
    const response = await fetch(`${origin}/api/quote?plan=enterprise&quantity=1`, {
      headers: { "x-role": "member" }
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Plan must be standard or premium" });
  });
});
