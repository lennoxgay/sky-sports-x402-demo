export type Match = {
  id: string;
  competition: string;
  home: string;
  away: string;
  kickoff: string;
  venue: string;
  priceUsd: string;
  preview: string;
  report: string;
  score: string;
};

export const MATCHES: Match[] = [
  { id: "m01", competition: "Premier League", home: "Arsenal", away: "Liverpool", kickoff: "Sat 17:30", venue: "Emirates Stadium", priceUsd: "0.0049", preview: "Title-race six-pointer. Saka vs Salah on the same flank.", report: "Arsenal 2-1 Liverpool. Saka opens, Salah levels, Rice wins it late.", score: "2-1" },
  { id: "m02", competition: "Premier League", home: "Man City", away: "Chelsea", kickoff: "Sat 15:00", venue: "Etihad Stadium", priceUsd: "0.0049", preview: "Haaland against a low Chelsea block.", report: "Man City 1-1 Chelsea. Haaland scores, Palmer replies from the spot.", score: "1-1" },
  { id: "m03", competition: "Premier League", home: "Man Utd", away: "Tottenham", kickoff: "Sun 16:30", venue: "Old Trafford", priceUsd: "0.0049", preview: "Open game expected. Fernandes vs Maddison in midfield.", report: "Man Utd 2-2 Tottenham. Four goals, two reds, and a late VAR check.", score: "2-2" },
  { id: "m04", competition: "Premier League", home: "Newcastle", away: "Brighton", kickoff: "Sat 12:30", venue: "St James' Park", priceUsd: "0.0049", preview: "Isak's movement versus Brighton's high line.", report: "Newcastle 3-0 Brighton. Isak brace, Gordon with the third.", score: "3-0" },
  { id: "m05", competition: "Premier League", home: "Aston Villa", away: "West Ham", kickoff: "Sat 15:00", venue: "Villa Park", priceUsd: "0.0049", preview: "Watkins looking for a first-half goal against a deep Hammers side.", report: "Aston Villa 2-0 West Ham. Watkins and Rogers, both before the hour.", score: "2-0" },
  { id: "m06", competition: "Premier League", home: "Crystal Palace", away: "Everton", kickoff: "Sat 15:00", venue: "Selhurst Park", priceUsd: "0.0049", preview: "Set-piece battle. Eze on free kicks.", report: "Crystal Palace 1-0 Everton. Eze free kick, 71 minutes.", score: "1-0" },
  { id: "m07", competition: "Premier League", home: "Fulham", away: "Brentford", kickoff: "Sat 15:00", venue: "Craven Cottage", priceUsd: "0.0049", preview: "West London derby. Jimenez versus Wissa.", report: "Fulham 1-1 Brentford. Own goal, then Mbeumo equaliser.", score: "1-1" },
  { id: "m08", competition: "Premier League", home: "Bournemouth", away: "Wolves", kickoff: "Sat 15:00", venue: "Vitality Stadium", priceUsd: "0.0049", preview: "Semenyo running at a makeshift Wolves back line.", report: "Bournemouth 2-0 Wolves. Semenyo and Kluivert.", score: "2-0" },
  { id: "m09", competition: "Premier League", home: "Nott'm Forest", away: "Leicester", kickoff: "Sun 14:00", venue: "City Ground", priceUsd: "0.0049", preview: "East Midlands derby. Gibbs-White on the ball.", report: "Forest 2-1 Leicester. Wood double, Vardy consolation.", score: "2-1" },
  { id: "m10", competition: "Premier League", home: "Southampton", away: "Ipswich", kickoff: "Sun 14:00", venue: "St Mary's", priceUsd: "0.0049", preview: "Newly promoted clash. Both sides need points.", report: "Southampton 0-0 Ipswich. 18 shots, no finish.", score: "0-0" },
  { id: "m11", competition: "Scottish Premiership", home: "Celtic", away: "Rangers", kickoff: "Sun 12:00", venue: "Celtic Park", priceUsd: "0.0099", preview: "Old Firm. Packed house, no room on the flanks.", report: "Celtic 1-1 Rangers. Maeda, then Tavernier from the penalty spot.", score: "1-1" },
  { id: "m12", competition: "La Liga", home: "Barcelona", away: "Real Madrid", kickoff: "Sun 20:00", venue: "Spotify Camp Nou", priceUsd: "0.0099", preview: "El Clasico. Yamal versus Vinicius.", report: "Barcelona 3-2 Real Madrid. Five-goal classic, Yamal with two.", score: "3-2" },
  { id: "m13", competition: "Bundesliga", home: "Bayern", away: "Dortmund", kickoff: "Sat 17:30", venue: "Allianz Arena", priceUsd: "0.0099", preview: "Der Klassiker. Kane against a young BVB press.", report: "Bayern 2-0 Dortmund. Kane and Musiala.", score: "2-0" },
  { id: "m14", competition: "Ligue 1", home: "PSG", away: "Marseille", kickoff: "Sun 19:45", venue: "Parc des Princes", priceUsd: "0.0099", preview: "Le Classique. Dembele stretching Marseille's full-backs.", report: "PSG 4-1 Marseille. Dembele hat-trick.", score: "4-1" },
  { id: "m15", competition: "Serie A", home: "Inter", away: "AC Milan", kickoff: "Sun 17:00", venue: "San Siro", priceUsd: "0.0099", preview: "Derby della Madonnina. Lautaro versus Leao.", report: "Inter 2-1 AC Milan. Lautaro brace, Leao reply.", score: "2-1" },
];

export function getMatch(id: string): Match | undefined {
  return MATCHES.find((match) => match.id === id);
}

export function catalog() {
  return MATCHES.map(({ report, score, ...teaser }) => teaser);
}

export function paidReport(match: Match) {
  return {
    id: match.id,
    competition: match.competition,
    home: match.home,
    away: match.away,
    kickoff: match.kickoff,
    venue: match.venue,
    score: match.score,
    report: match.report,
    paid: true,
    asset: "USDC",
    priceUsd: match.priceUsd,
    disclaimer: "Mock commentary. Not affiliated with Sky or the clubs.",
  };
}
