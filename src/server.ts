import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import { createPayKit, usd } from "@solana/pay-kit";
import { catalog, getMatch, paidReport } from "./matches.ts";
import {
  DEVNET_RPC,
  DEVNET_USDC,
  confirmUsdcTransfer,
  hasReceipt,
  prepareUsdcTransfer,
} from "./devnet-usdc.ts";

const PORT = Number(process.env.PORT ?? 1402);

const pay = await createPayKit({
  rpcUrl: DEVNET_RPC,
  network: "devnet",
  accept: ["x402"],
  mpp: { challengeBindingSecret: process.env.PAY_KIT_MPP_SECRET ?? "sky-sports-x402-devnet-challenge-secret-01" },
});

const merchant = pay.config.operator.recipient;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(join(dirname(fileURLToPath(import.meta.url)), "../public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sky-sports-pay-sh", cluster: "devnet", rpc: DEVNET_RPC, merchant });
});

app.get("/api/v1/pay-config", (_req, res) => {
  res.json({
    cluster: "devnet",
    rpc: DEVNET_RPC,
    usdcMint: DEVNET_USDC,
    merchant,
    solFaucet: "https://faucet.solana.com",
    usdcFaucet: "https://faucet.circle.com",
  });
});

app.get("/api/v1/matches", (_req, res) => {
  res.json({
    package: "Sky Sports football weekend",
    settlement: "Circle USDC on Solana Devnet via Phantom",
    matches: catalog(),
  });
});

app.get("/api/v1/matches/:id", (req, res, next) => {
  const match = getMatch(req.params.id);
  if (!match) {
    res.status(404).json({ error: "Unknown match" });
    return;
  }
  const buyer = typeof req.query.payer === "string" ? req.query.payer : "";
  if (buyer && hasReceipt(buyer, match.id)) {
    res.json(paidReport(match));
    return;
  }
  return pay.express(usd(match.priceUsd))(req, res, next);
}, (req, res) => {
  res.json(paidReport(getMatch(req.params.id)!));
});

app.post("/api/v1/pay/prepare", async (req, res) => {
  const match = getMatch(String(req.body.matchId ?? ""));
  const buyer = String(req.body.buyer ?? "");
  if (!match) {
    res.status(404).json({ error: "Unknown match" });
    return;
  }
  if (!buyer) {
    res.status(400).json({ error: "Connect Phantom first." });
    return;
  }
  try {
    const transaction = await prepareUsdcTransfer(buyer, match, merchant);
    res.json({
      cluster: "devnet",
      match: `${match.home} vs ${match.away}`,
      priceUsd: match.priceUsd,
      mint: DEVNET_USDC,
      merchant,
      transaction,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Could not build transfer" });
  }
});

app.post("/api/v1/pay/confirm", async (req, res) => {
  const match = getMatch(String(req.body.matchId ?? ""));
  const buyer = String(req.body.buyer ?? "");
  const signature = String(req.body.signature ?? "");
  if (!match) {
    res.status(404).json({ error: "Unknown match" });
    return;
  }
  if (!buyer || !signature) {
    res.status(400).json({ error: "Missing buyer or signature" });
    return;
  }
  const result = await confirmUsdcTransfer(signature, buyer, match, merchant);
  if (!result.ok) {
    res.status(402).json(result);
    return;
  }
  res.json({
    wallet: buyer,
    match: `${match.home} vs ${match.away}`,
    priceUsd: match.priceUsd,
    signature,
    explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    result: result.report,
  });
});

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Sky Sports Devnet demo → http://127.0.0.1:${PORT}`);
  console.log(`Merchant (USDC)        → ${merchant}`);
  console.log(`Cluster                → devnet ${DEVNET_RPC}`);
});

server.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
