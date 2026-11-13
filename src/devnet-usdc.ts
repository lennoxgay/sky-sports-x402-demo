import {
  Connection,
  PublicKey,
  Transaction,
  type TransactionSignature,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { paidReport, type Match } from "./matches.ts";

/** Circle USDC on Solana Devnet. */
export const DEVNET_USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const DEVNET_RPC = process.env.SOLANA_RPC ?? "https://api.devnet.solana.com";

const connection = new Connection(DEVNET_RPC, "confirmed");
const paid = new Set<string>();

export function usdToAtomic(usd: string): bigint {
  return BigInt(Math.round(Number(usd) * 1_000_000));
}

export function hasReceipt(buyer: string, matchId: string): boolean {
  return paid.has(`${buyer}:${matchId}`);
}

export function recordReceipt(buyer: string, matchId: string): void {
  paid.add(`${buyer}:${matchId}`);
}

export async function prepareUsdcTransfer(buyer: string, match: Match, merchant: string): Promise<string> {
  const owner = new PublicKey(buyer);
  const payTo = new PublicKey(merchant);
  const mint = new PublicKey(DEVNET_USDC);
  const fromAta = getAssociatedTokenAddressSync(mint, owner);
  const toAta = getAssociatedTokenAddressSync(mint, payTo);
  const amount = usdToAtomic(match.priceUsd);

  const tx = new Transaction();
  tx.add(createAssociatedTokenAccountIdempotentInstruction(owner, toAta, payTo, mint));
  tx.add(
    createTransferCheckedInstruction(fromAta, mint, toAta, owner, amount, 6, [], TOKEN_PROGRAM_ID),
  );
  tx.feePayer = owner;
  tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}

export async function confirmUsdcTransfer(
  signature: TransactionSignature,
  buyer: string,
  match: Match,
  merchant: string,
): Promise<{ ok: true; report: ReturnType<typeof paidReport> } | { ok: false; error: string }> {
  const expected = usdToAtomic(match.priceUsd);
  const toAta = getAssociatedTokenAddressSync(new PublicKey(DEVNET_USDC), new PublicKey(merchant)).toBase58();

  const status = await connection.confirmTransaction(signature, "confirmed");
  if (status.value.err) {
    return { ok: false, error: `Devnet transaction failed: ${JSON.stringify(status.value.err)}` };
  }

  const parsed = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!parsed?.meta) {
    return { ok: false, error: "Transaction not found on Devnet. Stay on Phantom Devnet and retry confirm." };
  }

  const feePayer = parsed.transaction.message.accountKeys[0]?.pubkey.toBase58();
  if (feePayer && feePayer !== buyer) {
    return { ok: false, error: "Fee payer is not the connected Phantom wallet." };
  }

  const pre = parsed.meta.preTokenBalances ?? [];
  const post = parsed.meta.postTokenBalances ?? [];
  const preAmt = BigInt(pre.find((b) => b.mint === DEVNET_USDC && b.owner === merchant)?.uiTokenAmount.amount ?? "0");
  const postAmt = BigInt(post.find((b) => b.mint === DEVNET_USDC && b.owner === merchant)?.uiTokenAmount.amount ?? "0");
  const destPost = post.find((b) => b.accountIndex !== undefined && post.some(() => true) && b.mint === DEVNET_USDC);
  const byAta = post.find((b) => {
    const keys = parsed.transaction.message.accountKeys;
    const addr = keys[b.accountIndex]?.pubkey.toBase58();
    return addr === toAta && b.mint === DEVNET_USDC;
  });
  const credited =
    postAmt - preAmt > 0n
      ? postAmt - preAmt
      : BigInt(byAta?.uiTokenAmount.amount ?? destPost?.uiTokenAmount.amount ?? "0") - preAmt;

  if (credited < expected) {
    return {
      ok: false,
      error: `Need ${match.priceUsd} Devnet USDC (${DEVNET_USDC}) sent to the merchant. Got ${credited} base units. Use https://faucet.circle.com and keep Phantom on Devnet. Also keep a little Devnet SOL for fees (https://faucet.solana.com).`,
    };
  }

  recordReceipt(buyer, match.id);
  return { ok: true, report: paidReport(match) };
}
