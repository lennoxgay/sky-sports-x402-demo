import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FULL_PLAN, PLANS, getPlan } from "./catalog.ts";
import { liveFeed } from "./feed.ts";
import {
  decodePayment,
  encodePayment,
  makeSandboxPayment,
  paymentRequiredFor,
  verifySandboxPayment,
} from "./protocol.ts";
import {
  activateSubscription,
  activePlans,
  activeSubscriptions,
  cancelSubscription,
  listSubscriptions,
  payerFromToken,
} from "./store.ts";

const PORT = Number(process.env.PORT ?? 1402);
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const DEFAULT_PAYER = "browser-wallet";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

function originOf(req: IncomingMessage): string {
  const host = req.headers.host ?? `127.0.0.1:${PORT}`;
  return `http://${host}`;
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "Content-Type, X-PAYMENT, X-PAYMENT-RESPONSE",
    "access-control-expose-headers": "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE",
    ...headers,
  });
  res.end(payload);
}

function cookies(req: IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(rest.join("="));
  }
  return out;
}

async function readJson(req: IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function resolvePayer(req: IncomingMessage): { payer?: string; extraPlans: ReturnType<typeof activePlans> } {
  const tokenPayer = payerFromToken(cookies(req)["x402-sub"]);
  const extraPlans = activePlans(tokenPayer);
  const header = req.headers["x-payment"];
  if (typeof header === "string" && header.length) {
    try {
      const payment = decodePayment(header);
      const verified = verifySandboxPayment(payment);
      if (!verified.error && verified.plan) {
        const payer = payment.payload.payer;
        const already = activePlans(payer).some((plan) => plan.id === verified.plan!.id);
        if (!already) activateSubscription(payer, verified.plan.id);
        return { payer, extraPlans: activePlans(payer) };
      }
    } catch {
      /* fall through */
    }
  }
  return { payer: tokenPayer, extraPlans };
}

function livePayload(req: IncomingMessage) {
  const { payer, extraPlans } = resolvePayer(req);
  const subscriptions = activeSubscriptions(payer);
  const feed = liveFeed(extraPlans);
  return {
    payer: payer ?? null,
    subscriptions,
    catalog: PLANS,
    feed,
  };
}

function requireResource(req: IncomingMessage, res: ServerResponse, resource: string): boolean {
  const plan = getPlan(resource);
  if (!plan) {
    send(res, 404, { error: `Unknown resource ${resource}` });
    return true;
  }
  const { extraPlans } = resolvePayer(req);
  const covered =
    plan.kind === "full"
      ? extraPlans.some((item) => item.kind === "full")
      : extraPlans.some((item) => item.id === plan.id || item.kind === "full");
  if (covered) {
    send(res, 200, livePayload(req));
    return true;
  }
  const offers = plan.kind === "full" ? [FULL_PLAN] : [plan, FULL_PLAN];
  const challenge = paymentRequiredFor(originOf(req), offers);
  send(res, 402, challenge, {
    "PAYMENT-REQUIRED": encodeURIComponent(JSON.stringify(challenge)),
  });
  return true;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", originOf(req));
    if (req.method === "OPTIONS") {
      send(res, 204, "");
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/v1/catalog") {
      send(res, 200, { plans: PLANS });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/v1/live") {
      const resource = url.searchParams.get("resource");
      const strict = url.searchParams.get("strict") === "1" || Boolean(resource);
      if (strict) {
        requireResource(req, res, resource || "sky-live");
        return;
      }
      send(res, 200, livePayload(req));
      return;
    }

    if (req.method === "POST" && url.pathname === "/sandbox/pay") {
      const body = await readJson(req);
      const payer = body.payer || DEFAULT_PAYER;
      const resource = body.resource || "sky-live";
      const plan = getPlan(resource);
      if (!plan) {
        send(res, 400, { error: `Unknown resource ${resource}` });
        return;
      }
      const payment = makeSandboxPayment(payer, resource);
      const { sub, token } = activateSubscription(payer, resource);
      send(
        res,
        200,
        {
          ok: true,
          payment,
          xPayment: encodePayment(payment),
          subscription: sub,
          subscriptions: activeSubscriptions(payer),
        },
        {
          "set-cookie": `x402-sub=${token}; Path=/; HttpOnly; SameSite=Lax`,
        },
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/subscriptions") {
      send(res, 200, { subscriptions: listSubscriptions() });
      return;
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/subscriptions/") && url.pathname.endsWith("/cancel")) {
      const id = url.pathname.split("/")[3];
      const sub = cancelSubscription(id);
      if (!sub) {
        send(res, 404, { error: "Subscription not found" });
        return;
      }
      send(res, 200, { subscription: sub });
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      send(res, 200, { ok: true, service: "sky-sports-x402-demo", port: PORT, microSubscriptions: true });
      return;
    }

    let filePath = join(PUBLIC, url.pathname === "/" ? "index.html" : url.pathname);
    if (!filePath.startsWith(PUBLIC)) {
      send(res, 403, { error: "Forbidden" });
      return;
    }
    try {
      const data = await readFile(filePath);
      res.writeHead(200, { "content-type": MIME[extname(filePath)] ?? "application/octet-stream" });
      res.end(data);
    } catch {
      send(res, 404, { error: "Not found" });
    }
  } catch (err) {
    send(res, 500, { error: err instanceof Error ? err.message : "Server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Sky Sports x402 demo → http://127.0.0.1:${PORT}`);
  console.log(`Catalog               → GET /api/v1/catalog`);
  console.log(`Mixed live board      → GET /api/v1/live`);
  console.log(`Strict Chelsea slice  → GET /api/v1/live?resource=sky-live:team:chelsea`);
});

