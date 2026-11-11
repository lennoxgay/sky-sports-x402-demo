import { PERIOD_MS } from "./protocol.ts";
import { getPlan, type Plan } from "./catalog.ts";

export type Subscription = {
  id: string;
  payer: string;
  resource: string;
  title: string;
  kind: string;
  status: "active" | "cancelled";
  startedAt: string;
  expiresAt: string;
};

const byPayer = new Map<string, Subscription[]>();
const tokenToPayer = new Map<string, string>();
const payerToToken = new Map<string, string>();

function isLive(sub: Subscription): boolean {
  return sub.status === "active" && Date.parse(sub.expiresAt) > Date.now();
}

export function activateSubscription(payer: string, resource: string): { sub: Subscription; token: string } {
  const plan = getPlan(resource);
  if (!plan) throw new Error(`Unknown plan ${resource}`);
  const now = Date.now();
  const list = byPayer.get(payer) ?? [];
  const existing = list.find((sub) => sub.resource === resource);
  const sub: Subscription = {
    id: existing?.id ?? crypto.randomUUID(),
    payer,
    resource: plan.id,
    title: plan.title,
    kind: plan.kind,
    status: "active",
    startedAt: existing?.startedAt ?? new Date(now).toISOString(),
    expiresAt: new Date(now + PERIOD_MS).toISOString(),
  };
  const next = existing
    ? list.map((item) => (item.resource === resource ? sub : item))
    : [...list, sub];
  byPayer.set(payer, next);

  let token = payerToToken.get(payer);
  if (!token) {
    token = crypto.randomUUID();
    payerToToken.set(payer, token);
    tokenToPayer.set(token, payer);
  }
  return { sub, token };
}

export function payerFromToken(token: string | undefined): string | undefined {
  if (!token) return undefined;
  return tokenToPayer.get(token);
}

export function activeSubscriptions(payer: string | undefined): Subscription[] {
  if (!payer) return [];
  return (byPayer.get(payer) ?? []).filter(isLive);
}

export function activePlans(payer: string | undefined): Plan[] {
  return activeSubscriptions(payer)
    .map((sub) => getPlan(sub.resource))
    .filter((plan): plan is Plan => Boolean(plan));
}

export function hasFullAccess(payer: string | undefined): boolean {
  return activePlans(payer).some((plan) => plan.kind === "full");
}

export function listSubscriptions(): Subscription[] {
  return [...byPayer.values()].flat();
}

export function cancelSubscription(id: string): Subscription | undefined {
  for (const [payer, list] of byPayer) {
    const found = list.find((sub) => sub.id === id);
    if (found) {
      found.status = "cancelled";
      byPayer.set(payer, list);
      return found;
    }
  }
  return undefined;
}
