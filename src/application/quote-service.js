import { calculateQuote } from "../domain/quote.js";

export class AuthorizationError extends Error {
  constructor() {
    super("A member or admin role is required");
    this.name = "AuthorizationError";
  }
}

export function createQuoteForRole(role, plan, quantity) {
  if (role !== "member" && role !== "admin") {
    throw new AuthorizationError();
  }

  return calculateQuote({ plan, quantity });
}
