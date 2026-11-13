import { Transaction } from "@solana/web3.js";

type MatchCard = {
  id: string;
  competition: string;
  home: string;
  away: string;
  kickoff: string;
  venue: string;
  priceUsd: string;
  preview: string;
};

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
};

const grid = document.getElementById("grid")!;
const logEl = document.getElementById("log")!;
const report = document.getElementById("report")!;
const walletEl = document.getElementById("wallet")!;
const connectBtn = document.getElementById("connect") as HTMLButtonElement;

let wallet: string | null = null;
let unlocking = false;

function log(title: string, data: unknown) {
  logEl.textContent = title + "\n" + (typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

function phantom(): PhantomProvider | undefined {
  const injected = (window as unknown as { solana?: PhantomProvider; phantom?: { solana?: PhantomProvider } }).solana
    ?? (window as unknown as { phantom?: { solana?: PhantomProvider } }).phantom?.solana;
  return injected;
}

async function connectWallet() {
  const provider = phantom();
  if (!provider) {
    walletEl.textContent = "Install the Phantom extension, switch it to Devnet, then connect.";
    return;
  }
  const resp = await provider.connect();
  wallet = resp.publicKey.toString();
  walletEl.textContent = `Wallet: ${wallet} · Phantom must be on Devnet. Unlock will debit Circle USDC and a little SOL for fees.`;
}

function renderCatalog(matches: MatchCard[]) {
  grid.innerHTML = matches.map((m) => `
    <div class="fixture">
      <div class="comp">${m.competition} · ${m.kickoff}</div>
      <h3>${m.home} vs ${m.away}</h3>
      <p>${m.venue}</p>
      <p class="teaser">${m.preview}</p>
      <div class="plan-price">$${m.priceUsd} USDC</div>
      <button type="button" data-id="${m.id}">Unlock with Solana</button>
      <button type="button" class="ghost tiny" data-probe="${m.id}">See 402</button>
    </div>
  `).join("");
}

function showReport(payload: {
  home: string;
  away: string;
  score: string;
  competition: string;
  venue: string;
  priceUsd: string;
  asset?: string;
  report: string;
}, explorer?: string) {
  report.classList.remove("muted");
  const tx = explorer && explorer.startsWith("http")
    ? `<p><a href="${explorer}" target="_blank" rel="noopener noreferrer">View Devnet transaction</a></p>`
    : "";
  report.innerHTML = `
    <div class="headline">${payload.home} ${payload.score} ${payload.away}</div>
    <div class="meta">${payload.competition} · ${payload.venue} · paid ${payload.priceUsd} ${payload.asset ?? "USDC"}</div>
    <p>${payload.report}</p>
    ${tx}
  `;
}

async function probe(id: string) {
  const res = await fetch(`/api/v1/matches/${id}`);
  log(`${res.status} GET /api/v1/matches/${id}`, await res.json());
}

async function unlock(id: string) {
  if (unlocking) return;
  const provider = phantom();
  if (!wallet || !provider) {
    log("Connect Phantom on Devnet first", {});
    walletEl.textContent = "Connect Phantom (Devnet) before unlocking.";
    await connectWallet();
    if (!wallet) return;
  }
  unlocking = true;
  report.classList.add("muted");
  report.textContent = "Approve the USDC transfer in Phantom…";
  try {
    const prep = await fetch("/api/v1/pay/prepare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId: id, buyer: wallet }),
    });
    const prepared = await prep.json();
    log("Prepared Devnet USDC transfer — Phantom should pop", prepared);
    if (!prep.ok) throw new Error(prepared.error || "prepare failed");

    const raw = Uint8Array.from(atob(prepared.transaction), (c) => c.charCodeAt(0));
    const tx = Transaction.from(raw);
    const sent = await provider.signAndSendTransaction(tx);
    log("Phantom submitted Devnet tx", { signature: sent.signature, explorer: `https://solscan.io/tx/${sent.signature}?cluster=devnet` });

    const confirmed = await fetch("/api/v1/pay/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId: id, buyer: wallet, signature: sent.signature }),
    });
    const data = await confirmed.json();
    log(`${confirmed.status} POST /api/v1/pay/confirm`, data);
    if (confirmed.ok && data.result?.paid) {
      showReport(data.result, data.explorer);
    } else {
      report.textContent = data.error || "Payment not confirmed on Devnet.";
    }
  } catch (err) {
    log("Unlock failed", String(err));
    report.textContent = String(err);
  } finally {
    unlocking = false;
  }
}

connectBtn.addEventListener("click", () => connectWallet().catch((err) => log("Wallet connect failed", String(err))));
grid.addEventListener("click", (event) => {
  const t = event.target as HTMLElement;
  const unlockBtn = t.closest("button[data-id]") as HTMLButtonElement | null;
  const probeBtn = t.closest("button[data-probe]") as HTMLButtonElement | null;
  if (unlockBtn?.dataset.id) unlock(unlockBtn.dataset.id);
  if (probeBtn?.dataset.probe) probe(probeBtn.dataset.probe);
});

fetch("/api/v1/matches")
  .then((res) => res.json())
  .then((data) => {
    renderCatalog(data.matches);
    log("200 GET /api/v1/matches (free catalog)", data);
  })
  .catch((err) => log("Catalog failed — run npm start", String(err)));
