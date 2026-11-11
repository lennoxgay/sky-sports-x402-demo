import { getPlan } from "./catalog.ts";
import { encodePayment, makeSandboxPayment, type PaymentRequired } from "./protocol.ts";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:1402";
const args = process.argv.slice(2);
const resourceFlag = args.find((arg) => arg.startsWith("--resource="))?.slice("--resource=".length)
  ?? (args.includes("--resource") ? args[args.indexOf("--resource") + 1] : undefined);
const pathArg = args.find((arg) => arg.startsWith("/") || arg.startsWith("http"));
const resource = resourceFlag ?? "sky-live:team:chelsea";
const path = pathArg ?? `/api/v1/live?resource=${encodeURIComponent(resource)}`;
const url = path.startsWith("http") ? path : `${BASE}${path}`;

async function main() {
  console.log(`GET ${url}`);
  const first = await fetch(url);
  console.log(`→ ${first.status} ${first.statusText}`);

  if (first.status !== 402) {
    console.log(await first.text());
    return;
  }

  const challenge = (await first.json()) as PaymentRequired;
  console.log("x402 Payment Required (micro-subscription options):");
  for (const offer of challenge.accepts) {
    const sub = offer.extra.subscription;
    console.log(`  - ${sub.title ?? offer.extra.name}: ${sub.priceUsd} ${sub.currency} / ${sub.period}`);
  }

  const chosen = challenge.accepts.find((offer) => offer.extra.name === resource) ?? challenge.accepts[0];
  const plan = getPlan(chosen.extra.name);
  const payment = makeSandboxPayment("cli-wallet", plan?.id ?? resource);
  const header = encodePayment(payment);
  console.log(`\nPaying sandbox resource ${payment.payload.resource}…`);

  const second = await fetch(url, { headers: { "X-PAYMENT": header } });
  console.log(`→ ${second.status} ${second.statusText}`);
  console.log(JSON.stringify(await second.json(), null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
