import test from "node:test";
import assert from "node:assert/strict";
import { calculateQuote, roundMoney } from "../../src/domain/quote.js";

test("standard quote below free shipping threshold", () => {
  assert.deepEqual(calculateQuote({ plan: "standard", quantity: 1 }), {
    unitPrice: 40, quantity: 1, subtotal: 40, discount: 0, shipping: 8, tax: 4, total: 52
  });
});

test("premium discount and free shipping", () => {
  assert.deepEqual(calculateQuote({ plan: "premium", quantity: 2 }), {
    unitPrice: 60, quantity: 2, subtotal: 120, discount: 12, shipping: 0, tax: 10.8, total: 118.8
  });
});

test("free shipping boundary is inclusive", () => {
  assert.equal(calculateQuote({ plan: "standard", quantity: 2 }).shipping, 0);
});

test("invalid quantities are rejected", () => {
  for (const quantity of [0, -1, 1.5]) {
    assert.throws(() => calculateQuote({ plan: "standard", quantity }), /positive integer/);
  }
});

test("unsupported plans are rejected", () => {
  assert.throws(() => calculateQuote({ plan: "enterprise", quantity: 1 }), /standard or premium/);
});

test("money is rounded to two decimal places", () => {
  assert.equal(roundMoney(10.126), 10.13);
});
