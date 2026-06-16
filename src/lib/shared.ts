/* Client-safe helpers & types shared by server and browser code. */

const IMG = "https://imagecache.365scores.com/image/upload";

export function competitorLogo(id: number, v = 1, size = 80) {
  return `${IMG}/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/v${v}/Competitors/${id}`;
}
export function competitionLogo(id: number, v = 1, size = 80) {
  return `${IMG}/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2,d_Competitions:default1.png/v${v}/Competitions/${id}`;
}
export function countryFlag(id: number, v = 1, size = 48) {
  return `${IMG}/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2/v${v}/Countries/${id}`;
}
export function athleteImage(id: number, v = 1, size = 80) {
  return `${IMG}/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2,d_Athletes:default1.png/v${v}/Athletes/${id}`;
}

/* ---- status helpers ---- */
export function isLive(statusGroup: number) {
  return statusGroup === 3;
}
export function isEnded(statusGroup: number) {
  return statusGroup === 4;
}
export function isScheduled(statusGroup: number) {
  return statusGroup === 1 || statusGroup === 2;
}

export function formatKickoff(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ---- shared types ---- */
export interface Competitor {
  id: number;
  name: string;
  symbolicName?: string;
  score?: number;
  imageVersion?: number;
  color?: string;
  isWinner?: boolean;
  nameForURL?: string;
}

export interface GameEvent {
  competitorId: number;
  gameTime?: number;
  gameTimeDisplay?: string;
  addedTime?: number;
  isMajor?: boolean;
  playerId?: number;
  player?: string;
  eventType?: {
    id: number;
    name: string;
    subTypeId?: number;
    subTypeName?: string;
  };
}

export interface RefereeInfo {
  id: number;
  name: string;
  countryId?: number;
  nameForURL?: string;
}

export interface Game {
  id: number;
  sportId: number;
  competitionId: number;
  competitionDisplayName?: string;
  roundName?: string;
  roundNum?: number;
  startTime: string;
  statusGroup: number;
  statusText?: string;
  shortStatusText?: string;
  gameTime?: number;
  gameTimeDisplay?: string;
  homeCompetitor: Competitor;
  awayCompetitor: Competitor;
  winner?: number;
  venue?: { id: number; name: string; capacity?: number };
  events?: GameEvent[];
  members?: { id: number; name?: string; competitorId?: number }[];
  hasStandings?: boolean;
  officials?: RefereeInfo[];
  tvNetworks?: { id: number; name: string; countryId?: number }[];
  hasTVNetworks?: boolean;
}

export interface Competition {
  id: number;
  countryId?: number;
  name: string;
  nameForURL?: string;
  imageVersion?: number;
  color?: string;
  popularityRank?: number;
  totalGames?: number;
  liveGames?: number;
}

export interface GamesResponse {
  games: Game[];
  competitions: Competition[];
  liveGamesCount?: number;
}

export interface LineupPlayer {
  id?: number;
  status?: number;
  statusText?: string;
  position?: { id: number; name: string; shortName?: string };
  formation?: { fieldPosition: number; fieldLine: number };
  yardFormation?: {
    line: number;
    fieldPosition: number;
    fieldLine: number;
    fieldSide: number;
  };
  competitorId?: number;
  competitor?: { id: number };
  jerseyNumber?: number;
  athleteId?: number;
  ranking?: number;
  name?: string;
}

export interface Lineup {
  status?: string;
  formation?: string;
  hasFieldPositions?: boolean;
  members?: LineupPlayer[];
}

export interface Member {
  id: number;
  name?: string;
  shortName?: string;
  athleteId?: number;
  competitorId?: number;
  jerseyNumber?: number;
  imageVersion?: number;
}

export interface GameDetailResponse {
  game: (Game & {
    homeCompetitor: Competitor & { lineups?: Lineup };
    awayCompetitor: Competitor & { lineups?: Lineup };
    members?: Member[];
  }) | null;
  error?: string;
}

export interface StandingRow {
  competitor: Competitor;
  gamePlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesEven: number;
  for: number;
  against: number;
  ratio: number;
  points: number;
  position?: number;
  groupName?: string;
}

export interface StandingsResponse {
  standings: {
    competitionId: number;
    displayName?: string;
    rows: StandingRow[];
  }[];
}

export interface FavoriteItem {
  id: number;
  type: string;
  entityId: number;
  name: string;
  imageVersion?: number;
  meta?: Record<string, unknown> | null;
}

export interface MatchStatItem {
  id: number;
  name: string;
  competitorId: number;
  value: string;
  valuePercentage?: number;
  isMajor?: boolean;
  categoryName?: string;
  categoryId?: number;
}

export interface NewsItem {
  id: number;
  publishDate: string;
  title: string;
  image?: string;
  url: string;
  source?: { name?: string };
}

export interface ScorerRow {
  position: number;
  gameStatsValue?: number;
  secondaryStatName?: string;
  entity: {
    id: number;
    name: string;
    shortName?: string;
    competitorId?: number;
    positionName?: string;
    imageVersion?: number;
  };
  stats?: { value: number }[];
}

export function flagUrl(id: number, v = 1, size = 48) {
  return countryFlag(id, v, size);
}
