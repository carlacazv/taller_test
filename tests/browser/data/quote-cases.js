export const quoteCases = Object.freeze([
  {
    name: "standard quote below free-shipping threshold",
    plan: "standard",
    quantity: 1,
    expectedTotal: 52
  },
  {
    name: "premium quote applies discount and free shipping",
    plan: "premium",
    quantity: 2,
    expectedTotal: 118.8
  },
  {
    name: "free-shipping boundary is inclusive",
    plan: "standard",
    quantity: 2,
    expectedTotal: 88
  }
]);
