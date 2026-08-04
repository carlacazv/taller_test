import { createServer } from "node:http";
import { handleRequest } from "./http/app.js";

export function startServer({ port = 0, host = "127.0.0.1" } = {}) {
  const server = createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: error.message }));
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      resolve({
        server,
        origin: `http://${host}:${address.port}`
      });
    });
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.PORT || 3000);
  const { origin } = await startServer({ port });
  console.log(`TRIMS Mutation Layer Lab running at ${origin}`);
}
