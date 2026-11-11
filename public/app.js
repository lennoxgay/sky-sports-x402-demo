const logEl = document.getElementById("log");
const board = document.getElementById("board");
const pill = document.getElementById("sub-pill");
const catalogEl = document.getElementById("catalog");

const PAYER = "browser-wallet";

function log(title, data) {
  logEl.textContent = title + "\n" + JSON.stringify(data, null, 2);
}

function ownedIds(payload) {
  return new Set((payload.subscriptions || []).map((sub) => sub.resource));
}

function renderPill(payload) {
  const subs = payload.subscriptions || [];
  if (!subs.length) {
    pill.textContent = "No plans";
    pill.className = "pill locked";
    return;
  }
  const full = subs.find((sub) => sub.kind === "full");
  pill.textContent = full
    ? `Full access until ${new Date(full.expiresAt).toLocaleDateString()}`
    : `${subs.length} micro-plan${subs.length > 1 ? "s" : ""}`;
  pill.className = "pill open";
}

function renderCatalog(payload) {
  const owned = ownedIds(payload);
  catalogEl.innerHTML = (payload.catalog || []).map((plan) => {
    const mine = owned.has(plan.id);
    return `
      <div class="plan ${mine ? "owned" : ""}">
        <div class="plan-kicker">${plan.kind === "full" ? "Full" : "Micro"}</div>
        <h3>${plan.title}</h3>
        <p>${plan.description}</p>
        <div class="plan-price">$${plan.priceUsd} ${plan.currency} / ${plan.period}</div>
        <button type="button" data-resource="${plan.id}" ${mine ? "disabled" : ""}>
          ${mine ? "Active" : "Pay sandbox"}
        </button>
      </div>
    `;
  }).join("");
}

function renderFeed(payload) {
  const feed = payload.feed;
  board.classList.remove("muted");
  board.innerHTML = `<div class="headline">${feed.headline}</div>
    <div class="meta">${feed.unlockedCount}/${feed.totalCount} fixtures unlocked</div>` +
    feed.matches.map((m) => {
      if (m.unlocked) {
        return `
          <div class="match">
            <div class="comp">${m.competition}${m.note ? " · " + m.note : ""} · unlocked</div>
            <div class="home">${m.home}</div>
            <div class="score">${m.homeScore} – ${m.awayScore}<br><small>${m.minute}'</small></div>
            <div>${m.away}</div>
          </div>
        `;
      }
      const offers = (m.offers || []).map((plan) =>
        `<button type="button" class="ghost tiny" data-resource="${plan.id}">${plan.title} $${plan.priceUsd}</button>`
      ).join("");
      return `
        <div class="match locked">
          <div class="comp">${m.competition} · locked</div>
          <div class="home">${m.home}</div>
          <div class="score">–<br><small>paywall</small></div>
          <div>${m.away}</div>
          <div class="offers">${offers}</div>
        </div>
      `;
    }).join("");
}

function render(payload, title) {
  if (title) log(title, payload);
  renderPill(payload);
  renderCatalog(payload);
  renderFeed(payload);
}

async function requestLive() {
  const res = await fetch("/api/v1/live", { credentials: "include" });
  const data = await res.json();
  render(data, `${res.status} GET /api/v1/live`);
}

async function pay(resource) {
  const res = await fetch("/sandbox/pay", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payer: PAYER, resource }),
  });
  const data = await res.json();
  log(`200 POST /sandbox/pay ${resource}`, data);
  await requestLive();
}

document.body.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-resource]");
  if (!button) return;
  pay(button.dataset.resource);
});

requestLive().catch((err) => {
  log("Failed to load live board", { error: String(err) });
});
