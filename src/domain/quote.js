export const PRICES = Object.freeze({
  standard: 40,
  premium: 60
});

export function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

export function calculateQuote({ plan, quantity }) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive integer");
  }

  if (!(plan in PRICES)) {
    throw new Error("Plan must be standard or premium");
  }

  const unitPrice = PRICES[plan];
  const subtotal = unitPrice * quantity;
  const discount = plan === "premium" && subtotal >= 100 ? subtotal * 0.1 : 0;
  const discountedSubtotal = subtotal - discount;
  const shipping = discountedSubtotal >= 80 ? 0 : 8;
  const tax = discountedSubtotal * 0.1;
  const total = discountedSubtotal + shipping + tax;

  return {
    unitPrice,
    quantity,
    subtotal: roundMoney(subtotal),
    discount: roundMoney(discount),
    shipping: roundMoney(shipping),
    tax: roundMoney(tax),
    total: roundMoney(total)
  };
}
