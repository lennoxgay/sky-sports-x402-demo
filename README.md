# Sky Sports Pay.sh demo

Pick **one of 15 football matches** from a weekend package and unlock the report with **Pay.sh / x402** in USDC on Solana.

The catalog is free. Each match report is a one-shot charge (`$0.0049` or `$0.0099` for derbies) in Devnet USDC so tests stay cheap.

Not affiliated with Sky.

## Run

```bash
npm install
npm start
```

Open [http://127.0.0.1:1402](http://127.0.0.1:1402). Connect a Solana wallet (Phantom) to identify the payer, pick a fixture, then **Unlock with Solana**.

Pay.sh CLI (your Pay.sh sandbox wallet, auto-funded):

```bash
npx @solana/pay --sandbox --x402 curl http://127.0.0.1:1402/api/v1/matches/m12
npm run pay -- m04
```

On Windows the npm `pay` wrapper needs `unzip`. If that fails, use [pay.sh install docs](https://pay.sh/docs/building-with-pay/getting-started) or Git for Windows and retry.

## What is using Pay.sh

| Piece | Role |
| --- | --- |
| `@solana/pay-kit` | Official Pay TypeScript SDK. Issues HTTP **402**, verifies x402/MPP, settles USDC on Surfpool. |
| `npx @solana/pay` | Pay.sh CLI. Signs with a sandbox Solana wallet and retries with payment proof. |
| `sky-sports.yml` | Pay.sh gateway spec for the same 15-match package. |

`GET /api/v1/matches` is free. `GET /api/v1/matches/:id` is gated. `POST /api/v1/checkout/:id` pays that 402 with the Pay.sh **demo sandbox wallet**.