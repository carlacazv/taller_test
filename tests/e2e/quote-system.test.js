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

test("serves the composed quote page with its browser wiring", async () => {
  await withServer(async (origin) => {
    const response = await fetch(origin);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /<h1>TRIMS Quote Lab<\/h1>/);
    assert.match(html, /id="quote-form"/);
    assert.match(html, /fetch\(`\/api\/quote\?plan=\$\{plan\}&quantity=\$\{quantity\}`/);
  });
});

test("completes the public system flow through the deployed HTTP boundary", async () => {
  await withServer(async (origin) => {
    const response = await fetch(`${origin}/api/quote?plan=premium&quantity=2`, {
      headers: { "x-role": "member" }
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.quote.total, 118.8);
  });
});
