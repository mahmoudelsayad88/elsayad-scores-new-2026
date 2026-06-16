import "server-only";
import { db } from "@/db";
import { apiCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import type {
  Competitor,
  Competition,
  GamesResponse,
  GameDetailResponse,
  StandingsResponse,
} from "@/lib/shared";

export * from "@/lib/shared";

/* ------------------------------------------------------------------ */
/*  365scores upstream configuration                                   */
/* ------------------------------------------------------------------ */

const BASE = "https://webws.365scores.com/web";

// langId: 27 = Arabic, 1 = English
export type Lang = "ar" | "en";
function langId(lang: Lang) {
  return lang === "en" ? "1" : "27";
}

function common(lang: Lang) {
  return {
    appTypeId: "5",
    langId: langId(lang),
    timezoneName: "Africa/Cairo",
    userCountryId: "49",
  };
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function buildUrl(path: string, lang: Lang, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...common(lang), ...params });
  return `${BASE}${path}?${qs.toString()}`;
}

/* ------------------------------------------------------------------ */
/*  Cached fetch w/ DB fallback                                        */
/* ------------------------------------------------------------------ */

type CacheEntry<T> = { payload: T; updatedAt: string };
const memCache = new Map<string, { data: unknown; ts: number }>();

async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const rows = await db
      .select()
      .from(apiCache)
      .where(eq(apiCache.key, key))
      .limit(1);
    if (rows.length === 0) return null;
    return {
      payload: rows[0].payload as T,
      updatedAt: rows[0].updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

async function writeCache(key: string, payload: unknown) {
  try {
    await db
      .insert(apiCache)
      .values({ key, payload, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: apiCache.key,
        set: { payload, updatedAt: new Date() },
      });
  } catch {
    /* ignore cache write errors */
  }
}

async function cachedFetch<T>(
  url: string,
  key: string,
  ttlMs: number,
): Promise<T> {
  const now = Date.now();
  const mem = memCache.get(key);
  if (mem && now - mem.ts < ttlMs) return mem.data as T;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = (await res.json()) as T;
    memCache.set(key, { data, ts: now });
    void writeCache(key, data);
    return data;
  } catch (err) {
    const cached = await readCache<T>(key);
    if (cached) return cached.payload;
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/*  Public data functions                                              */
/* ------------------------------------------------------------------ */

function ddmmyyyy(d: Date) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export async function getGamesByDate(
  dateISO: string,
  lang: Lang = "ar",
): Promise<GamesResponse> {
  const d = new Date(dateISO + "T12:00:00");
  const ds = ddmmyyyy(d);
  const url = buildUrl("/games/", lang, {
    sports: "1",
    showOdds: "false",
    startDate: ds,
    endDate: ds,
  });
  const data = await cachedFetch<GamesResponse>(
    url,
    `games:${lang}:${dateISO}`,
    30_000,
  );
  return {
    games: data.games ?? [],
    competitions: data.competitions ?? [],
    liveGamesCount: data.liveGamesCount ?? 0,
  };
}

export async function getLiveGames(lang: Lang = "ar"): Promise<GamesResponse> {
  const url = buildUrl("/games/current/", lang, {
    sports: "1",
    onlyLiveGames: "true",
  });
  const data = await cachedFetch<GamesResponse>(url, `games:live:${lang}`, 15_000);
  return {
    games: data.games ?? [],
    competitions: data.competitions ?? [],
    liveGamesCount: data.liveGamesCount ?? data.games?.length ?? 0,
  };
}

export async function getGame(gameId: number, lang: Lang = "ar") {
  const url = buildUrl("/game/", lang, { gameId: String(gameId) });
  return cachedFetch<GameDetailResponse>(url, `game:${lang}:${gameId}`, 20_000);
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
export interface MatchStatsResponse {
  statistics: MatchStatItem[];
}
export async function getMatchStats(gameId: number, lang: Lang = "ar") {
  const url = buildUrl("/game/stats/", lang, { games: String(gameId) });
  return cachedFetch<MatchStatsResponse>(
    url,
    `stats:${lang}:${gameId}`,
    20_000,
  );
}

export async function getStandings(competitionId: number, lang: Lang = "ar") {
  const url = buildUrl("/standings/", lang, {
    competitions: String(competitionId),
    live: "false",
  });
  return cachedFetch<StandingsResponse>(
    url,
    `standings:${lang}:${competitionId}`,
    300_000,
  );
}

export interface ScorerEntity {
  id: number;
  name: string;
  shortName?: string;
  competitorId?: number;
  positionName?: string;
  imageVersion?: number;
}
export interface ScorerRow {
  position: number;
  gameStatsValue?: number;
  secondaryStatName?: string;
  entity: ScorerEntity;
  stats?: { value: number }[];
}
export interface TopScorersResponse {
  stats?: {
    athletesStats?: { id: number; name: string; rows: ScorerRow[] }[];
  };
}
export async function getTopScorers(competitionId: number, lang: Lang = "ar") {
  const url = buildUrl("/stats/", lang, {
    competitions: String(competitionId),
    competitionStatType: "1",
  });
  return cachedFetch<TopScorersResponse>(
    url,
    `scorers:${lang}:${competitionId}`,
    600_000,
  );
}

export interface NewsItem {
  id: number;
  publishDate: string;
  title: string;
  image?: string;
  url: string;
  sourceId?: number;
  source?: { name?: string };
}
export interface NewsResponse {
  news: NewsItem[];
}
export async function getNews(lang: Lang = "ar", entityParam?: string) {
  const params: Record<string, string> = { sports: "1" };
  if (entityParam) params.entities = entityParam;
  const url = buildUrl("/news/", lang, params);
  return cachedFetch<NewsResponse>(
    url,
    `news:${lang}:${entityParam ?? "all"}`,
    300_000,
  );
}

export interface TeamInfo {
  id: number;
  name: string;
  symbolicName?: string;
  countryId?: number;
  color?: string;
  imageVersion?: number;
  mainCompetitionId?: number;
  competitions?: { id: number; name: string }[];
}
export interface TeamResponse {
  competitors: TeamInfo[];
  competitions?: Competition[];
}
export async function getTeam(teamId: number, lang: Lang = "ar") {
  const url = buildUrl("/competitors/", lang, { competitors: String(teamId) });
  return cachedFetch<TeamResponse>(url, `team:${lang}:${teamId}`, 600_000);
}

export interface AthleteInfo {
  id: number;
  name: string;
  shortName?: string;
  age?: number;
  position?: { id: number; name: string };
  formationPosition?: { id: number; name: string };
  nationalityName?: string;
  nationalityId?: number;
  clubId?: number;
  nationalTeamId?: number;
  imageVersion?: number;
}
export interface AthleteResponse {
  athletes: AthleteInfo[];
  competitors?: Competitor[];
}
export async function getAthlete(athleteId: number, lang: Lang = "ar") {
  const url = buildUrl("/athletes/", lang, { athletes: String(athleteId) });
  return cachedFetch<AthleteResponse>(
    url,
    `athlete:${lang}:${athleteId}`,
    600_000,
  );
}

export interface SearchResult {
  competitors?: Competitor[];
  competitions?: Competition[];
}
export async function search(term: string, lang: Lang = "ar"): Promise<SearchResult> {
  const url = buildUrl("/search/", lang, { query: term, sports: "1" });
  try {
    const data = await cachedFetch<{
      results?: { competitors?: Competitor[]; competitions?: Competition[] };
      competitors?: Competitor[];
      competitions?: Competition[];
    }>(url, `search:${lang}:${term.toLowerCase()}`, 600_000);
    return {
      competitors: data.results?.competitors ?? data.competitors ?? [],
      competitions: data.results?.competitions ?? data.competitions ?? [],
    };
  } catch {
    return { competitors: [], competitions: [] };
  }
}
