# Sky Sports x402 demo

Local sandbox of the [x402](https://www.x402.org/) paywall pattern: a mock Sky Sports live feed with a **full** 30-day plan and cheaper **micro-subscriptions** (Chelsea only, Arsenal only, Premier League, F1).

This is illustrative. Sky Sports does not expose an x402 endpoint, and no real funds move.

## Run

```bash
npm install
npm start
```

Open [http://127.0.0.1:1402](http://127.0.0.1:1402).

Buy a slice from the CLI (defaults to Chelsea):

```bash
npm run pay
npm run pay -- --resource sky-live:competition:premier-league
```

## How micro-subscriptions work

Each product is its own x402 **resource**:

| Resource | Price | Unlocks |
| --- | --- | --- |
| `sky-live` | $14.99 | Entire board |
| `sky-live:team:chelsea` | $2.99 | Fixtures that include Chelsea |
| `sky-live:team:arsenal` | $2.99 | Fixtures that include Arsenal |
| `sky-live:competition:premier-league` | $6.99 | Premier League fixtures |
| `sky-live:competition:formula-1` | $4.99 | F1 only |

Plans **stack** on the same payer. A Chelsea micro unlocks Chelsea rows; other rows stay locked until you buy another slice or the full plan. Full access covers every micro.

- `GET /api/v1/live` — mixed board (locked rows include `offers`)
- `GET /api/v1/live?resource=sky-live:team:chelsea` — classic **402** unless that slice (or full) is paid
- `POST /sandbox/pay` with `{ "resource": "sky-live:team:chelsea" }` — sandbox-settle that slice
