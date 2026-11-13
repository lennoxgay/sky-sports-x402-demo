const BASE = process.env.BASE_URL ?? "http://127.0.0.1:1402";
const id = process.argv[2] ?? "m12";
const url = `${BASE}/api/v1/matches/${id}`;

console.log(`Unpaid GET ${url}`);
const unpaid = await fetch(url);
console.log(`→ ${unpaid.status}`);
console.log(await unpaid.text());
console.log(`\nPay with Pay.sh CLI:`);
console.log(`  npx @solana/pay --sandbox --x402 curl ${url}`);
console.log(`\nOr POST ${BASE}/api/v1/checkout/${id} (sandbox demo wallet)`);
