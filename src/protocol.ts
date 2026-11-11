import { FULL_PLAN, getPlan, usdToAtomic, type Plan } from "./catalog.ts";

export const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
export const NETWORK = "solana-localnet";
export const ASSET = "USDC";
export const PAY_TO = "SkySportsDemo111111111111111111111111111";

export type PaymentRequired = {
  x402Version: 1;
  error: string;
  accepts: Array<{
    scheme: "exact";
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
    extra: {
      name: string;
      subscription: {
        period: "30d";
        priceUsd: number;
        currency: string;
        kind?: string;
        title?: string;
      };
    };
  }>;
};

export type PaymentPayload = {
  x402Version: 1;
  scheme: "exact";
  network: string;
  payload: {
    payer: string;
    amount: string;
    asset: string;
    resource: string;
    nonce: string;
    signature: string;
    issuedAt: string;
  };
};

export function acceptForPlan(origin: string, plan: Plan): PaymentRequired["accepts"][number] {
  return {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: usdToAtomic(plan.priceUsd),
    resource: `${origin}/api/v1/live?resource=${encodeURIComponent(plan.id)}`,
    description: `${plan.title} (30-day ${plan.kind === "full" ? "subscription" : "micro-subscription"})`,
    mimeType: "application/json",
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    asset: ASSET,
    extra: {
      name: plan.id,
      subscription: {
        period: plan.period,
        priceUsd: plan.priceUsd,
        currency: plan.currency,
        kind: plan.kind,
        title: plan.title,
      },
    },
  };
}

export function paymentRequiredFor(
  origin: string,
  plans: Plan[],
  error = "Payment required for this Sky Sports slice",
): PaymentRequired {
  const unique = [...new Map(plans.map((plan) => [plan.id, plan])).values()];
  if (!unique.some((plan) => plan.id === FULL_PLAN.id)) unique.push(FULL_PLAN);
  return {
    x402Version: 1,
    error,
    accepts: unique.map((plan) => acceptForPlan(origin, plan)),
  };
}

export function makeSandboxPayment(payer = "sandbox-wallet", resource = "sky-live"): PaymentPayload {
  const plan = getPlan(resource);
  const amount = plan ? usdToAtomic(plan.priceUsd) : "0";
  const nonce = crypto.randomUUID();
  return {
    x402Version: 1,
    scheme: "exact",
    network: NETWORK,
    payload: {
      payer,
      amount,
      asset: ASSET,
      resource,
      nonce,
      signature: `sandbox-${nonce}`,
      issuedAt: new Date().toISOString(),
    },
  };
}

export function encodePayment(payment: PaymentPayload): string {
  return Buffer.from(JSON.stringify(payment), "utf8").toString("base64url");
}

export function decodePayment(header: string): PaymentPayload {
  const json = Buffer.from(header, "base64url").toString("utf8");
  return JSON.parse(json) as PaymentPayload;
}

export function verifySandboxPayment(payment: PaymentPayload): { error: string | null; plan?: Plan } {
  if (payment.x402Version !== 1) return { error: "Unsupported x402 version" };
  if (payment.scheme !== "exact") return { error: "Unsupported scheme" };
  if (payment.network !== NETWORK) return { error: "Wrong network" };
  if (payment.payload.asset !== ASSET) return { error: "Unsupported asset" };
  const plan = getPlan(payment.payload.resource);
  if (!plan) return { error: "Unknown subscription resource" };
  if (BigInt(payment.payload.amount) < BigInt(usdToAtomic(plan.priceUsd))) {
    return { error: "Amount too low" };
  }
  if (!payment.payload.signature.startsWith("sandbox-")) {
    return { error: "Sandbox demo only accepts sandbox-* signatures" };
  }
  if (!payment.payload.payer) return { error: "Missing payer" };
  return { error: null, plan };
}
