export type PlanKind = "full" | "team" | "competition";

export type Plan = {
  id: string;
  title: string;
  description: string;
  kind: PlanKind;
  team?: string;
  competition?: string;
  priceUsd: number;
  period: "30d";
  currency: "USDC";
};

export type Match = {
  id: string;
  competition: string;
  home: string;
  away: string;
  minute: number;
  homeScore: number;
  awayScore: number;
  note?: string;
};

export const PLANS: Plan[] = [
  {
    id: "sky-live",
    title: "Sky Sports full",
    description: "Every live match and highlight in the demo feed",
    kind: "full",
    priceUsd: 14.99,
    period: "30d",
    currency: "USDC",
  },
  {
    id: "sky-live:team:chelsea",
    title: "Chelsea matches",
    description: "Only fixtures that include Chelsea",
    kind: "team",
    team: "chelsea",
    priceUsd: 2.99,
    period: "30d",
    currency: "USDC",
  },
  {
    id: "sky-live:team:arsenal",
    title: "Arsenal matches",
    description: "Only fixtures that include Arsenal",
    kind: "team",
    team: "arsenal",
    priceUsd: 2.99,
    period: "30d",
    currency: "USDC",
  },
  {
    id: "sky-live:competition:premier-league",
    title: "Premier League",
    description: "All Premier League fixtures in the feed",
    kind: "competition",
    competition: "premier-league",
    priceUsd: 6.99,
    period: "30d",
    currency: "USDC",
  },
  {
    id: "sky-live:competition:formula-1",
    title: "Formula 1",
    description: "F1 coverage only",
    kind: "competition",
    competition: "formula-1",
    priceUsd: 4.99,
    period: "30d",
    currency: "USDC",
  },
];

export const FULL_PLAN = PLANS[0];

export function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function usdToAtomic(usd: number): string {
  return String(Math.round(usd * 1_000_000));
}

export function getPlan(id: string | undefined): Plan | undefined {
  if (!id) return undefined;
  return PLANS.find((plan) => plan.id === id);
}

export function planCoversMatch(plan: Plan, match: Match): boolean {
  if (plan.kind === "full") return true;
  if (plan.kind === "team") {
    return slug(match.home) === plan.team || slug(match.away) === plan.team;
  }
  return slug(match.competition) === plan.competition;
}

export function entitlementsCoverMatch(plans: Plan[], match: Match): boolean {
  return plans.some((plan) => planCoversMatch(plan, match));
}

export function offersForMatch(match: Match): Plan[] {
  const micros = PLANS.filter((plan) => plan.kind !== "full" && planCoversMatch(plan, match));
  micros.sort((a, b) => a.priceUsd - b.priceUsd);
  return [...micros, FULL_PLAN];
}
