import {
  entitlementsCoverMatch,
  offersForMatch,
  type Match,
  type Plan,
} from "./catalog.ts";

const MATCHES: Match[] = [
  { id: "epl-1", competition: "Premier League", home: "Arsenal", away: "Liverpool", minute: 67, homeScore: 2, awayScore: 1 },
  { id: "epl-2", competition: "Premier League", home: "Man City", away: "Chelsea", minute: 34, homeScore: 0, awayScore: 0 },
  { id: "epl-3", competition: "Premier League", home: "Chelsea", away: "Tottenham", minute: 12, homeScore: 1, awayScore: 0 },
  { id: "spl-1", competition: "Scottish Premiership", home: "Celtic", away: "Rangers", minute: 81, homeScore: 1, awayScore: 1 },
  { id: "f1-1", competition: "Formula 1", home: "Lando Norris", away: "Max Verstappen", minute: 42, homeScore: 1, awayScore: 2, note: "Lap 42 · Norris leads Verstappen by 1.8s" },
];

const EVENTS = [
  "GOAL! Saka finishes from the edge of the box.",
  "Chelsea break — Palmer drives into the box.",
  "Yellow card — late challenge in midfield.",
  "VAR check complete: onside, goal stands.",
  "Save! Keeper tips it over the bar.",
  "Free kick in a dangerous area.",
];

export type PublicMatch = Omit<Match, "homeScore" | "awayScore" | "minute"> & {
  unlocked: boolean;
  lockedReason?: string;
  offers: Plan[];
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
};

export function liveFeed(plans: Plan[]) {
  const tick = Math.floor(Date.now() / 15_000);
  const matches: PublicMatch[] = MATCHES.map((m, i) => {
    const unlocked = entitlementsCoverMatch(plans, m);
    return {
      ...m,
      minute: Math.min(90, m.minute + ((tick + i) % 4)),
      unlocked,
      lockedReason: unlocked ? undefined : "Micro-subscription or full plan required",
      offers: unlocked ? [] : offersForMatch(m),
      homeScore: unlocked ? m.homeScore : 0,
      awayScore: unlocked ? m.awayScore : 0,
    };
  });

  const unlocked = matches.filter((m) => m.unlocked);
  const headline = unlocked.length
    ? EVENTS[tick % EVENTS.length]
    : "Subscribe to a slice of the board — try Chelsea matches for $2.99.";

  return {
    service: "Sky Sports Demo",
    resource: "sky-live",
    generatedAt: new Date().toISOString(),
    disclaimer: "Mock data only. Not affiliated with Sky or Sky Sports.",
    headline,
    unlockedCount: unlocked.length,
    totalCount: matches.length,
    matches: matches.map((m) =>
      m.unlocked
        ? m
        : { ...m, note: undefined, homeScore: null, awayScore: null, minute: null },
    ),
  };
}
