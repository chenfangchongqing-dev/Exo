// Aliyun Function Compute 3.0 Web Function
// Node.js 20+ custom runtime, startup: node server.mjs, listen on 0.0.0.0:9000.
// No npm packages required. All classroom and GLM secrets are environment variables.
import { createServer } from "node:http";
import teacherAgent from "./handler.mjs";

const PORT = Number(process.env.PORT || 9000);
const HOST = "0.0.0.0";
const requestBuckets = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_IP = Number(process.env.REQUESTS_PER_MINUTE || 120);

const limiter = {
  async limit({ key }) {
    const now = Date.now();
    if (requestBuckets.size > 2000) {
      for (const [k, v] of requestBuckets) {
        if (now - v.start >= WINDOW_MS) requestBuckets.delete(k);
      }
    }
    const current = requestBuckets.get(key);
    const entry = !current || now - current.start >= WINDOW_MS ? { start: now, count: 0 } : current;
    entry.count++;
    requestBuckets.set(key, entry);
    return { success: entry.count <= MAX_REQUESTS_PER_IP };
  }
};
const config = {
  GLM_API_KEY: process.env.GLM_API_KEY || "",
  CLASS_ACCESS_CODE: process.env.CLASS_ACCESS_CODE || "",
  GLM_MODEL: process.env.GLM_MODEL || "glm-4.7-flash",
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || "https://chenfangchongqing-dev.github.io",
  REQUEST_LIMITER: limiter
};
async function readBody(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 18_000) throw new Error("BODY_TOO_LARGE");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function route(req, res) {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ status: "ok", configured: !!config.GLM_API_KEY && !!config.CLASS_ACCESS_CODE }));
    return;
  }
  try {
    const body = await readBody(req);
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(name, value);
      else if (Array.isArray(value)) headers.set(name, value.join(", "));
    }
    // Do not trust a browser-supplied forwarded-IP header for quota enforcement.
    headers.set("CF-Connecting-IP", req.socket.remoteAddress || "unknown");
    const request = new Request("http://localhost" + (req.url || "/"), {
      method: req.method || "GET",
      headers,
      ...(body.byteLength ? { body: body.toString("utf8") } : {})
    });
    const reply = await teacherAgent.fetch(request, config);
    const outHeaders = Object.fromEntries(reply.headers.entries());
    // Node sets its own Transfer-Encoding/Content-Length.
    delete outHeaders["content-length"];
    res.writeHead(reply.status, outHeaders);
    res.end(Buffer.from(await reply.arrayBuffer()));
  } catch (error) {
    const isLarge = error && error.message === "BODY_TOO_LARGE";
    res.writeHead(isLarge ? 413 : 500, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(JSON.stringify({ error: isLarge ? "请求过大。" : "服务暂时不可用。" }));
  }
}
export const server = createServer(route);
if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, HOST, () => console.log("Inspire 4 GLM server listening on port", PORT));
}
