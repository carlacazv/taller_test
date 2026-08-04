import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { AuthorizationError, createQuoteForRole } from "../application/quote-service.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(currentDirectory, "../web/index.html");

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

export async function handleRequest(request, response) {
  const baseUrl = `http://${request.headers.host || "127.0.0.1"}`;
  const url = new URL(request.url || "/", baseUrl);

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/quote") {
    const role = request.headers["x-role"] || "guest";
    const plan = url.searchParams.get("plan");
    const quantity = Number(url.searchParams.get("quantity"));

    try {
      const quote = createQuoteForRole(role, plan, quantity);
      sendJson(response, 200, { quote });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        sendJson(response, 403, { error: error.message });
        return;
      }

      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
    return;
  }

  if (request.method === "GET") {
    const html = await readFile(indexPath, "utf8");
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}
