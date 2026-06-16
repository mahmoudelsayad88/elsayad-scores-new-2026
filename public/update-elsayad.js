#!/usr/bin/env node
/**
 * ============================================================
 * Elsayad Scores - تحديث التطبيق
 * ============================================================
 * هذا السكربت ينشئ/يحدّث كل ملفات التطبيق الجديدة.
 *
 * طريقة الاستخدام:
 *   1) انسخ هذا الملف إلى جذر مشروعك (نفس مستوى package.json)
 *   2) شغّله: node update-elsayad.js
 *   3) بعد ما يخلص: git add . && git commit -m "تحديث" && git push
 *   4) حدّث قاعدة البيانات: DATABASE_URL="رابطك" npx drizzle-kit push
 * ============================================================
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = __dirname; // جذر المشروع

function writeFile(path, content) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
  console.log(`✅ ${path}`);
}

console.log("🚀 بدء تحديث Elsayad Scores...\n");

/* ================================================================== */
/*  قاعدة البيانات                                                     */
/* ================================================================== */
writeFile("src/db/schema.ts", `import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const apiCache = pgTable("api_cache", {
  key: text("key").primaryKey(),
  payload: jsonb("payload").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userEmail: text("user_email").notNull(),
    type: text("type").notNull(),
    entityId: integer("entity_id").notNull(),
    name: text("name").notNull(),
    imageVersion: integer("image_version").default(1),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("favorites_user_type_entity_idx").on(
      t.userEmail,
      t.type,
      t.entityId,
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type ApiCacheRow = typeof apiCache.$inferSelect;
`);

/* ================================================================== */
/*  المكتبة الأساسية - 365scores API                                  */
/* ================================================================== */
writeFile("src/lib/scores.ts", `import "server-only";
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

const BASE = "https://webws.365scores.com/web";
const COMMON_AR = {
  appTypeId: "5",
  langId: "27",
  timezoneName: "Africa/Cairo",
  userCountryId: "49",
};
const COMMON_EN = { ...COMMON_AR, langId: "1" };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type Lang = "ar" | "en";

function common(lang: Lang) {
  return lang === "en" ? COMMON_EN : COMMON_AR;
}

function buildUrl(path: string, lang: Lang, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...common(lang), ...params });
  return \`\${BASE}\${path}?\${qs.toString()}\`;
}

type CacheEntry<T> = { payload: T; updatedAt: string };
const memCache = new Map<string, { data: unknown; ts: number }>();

async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const rows = await db.select().from(apiCache).where(eq(apiCache.key, key)).limit(1);
    if (rows.length === 0) return null;
    return { payload: rows[0].payload as T, updatedAt: rows[0].updatedAt.toISOString() };
  } catch { return null; }
}

async function writeCache(key: string, payload: unknown) {
  try {
    await db.insert(apiCache).values({ key, payload, updatedAt: new Date() })
      .onConflictDoUpdate({ target: apiCache.key, set: { payload, updatedAt: new Date() } });
  } catch {}
}

async function cachedFetch<T>(url: string, key: string, ttlMs: number): Promise<T> {
  const now = Date.now();
  const mem = memCache.get(key);
  if (mem && now - mem.ts < ttlMs) return mem.data as T;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(\`upstream \${res.status}\`);
    const data = (await res.json()) as T;
    memCache.set(key, { data, ts: now });
    void writeCache(key, data);
    return data;
  } catch {
    const cached = await readCache<T>(key);
    if (cached) return cached.payload;
    throw new Error("fetch failed");
  }
}

function ddmmyyyy(d: Date) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return \`\${day}/\${month}/\${d.getFullYear()}\`;
}

export async function getGamesByDate(dateISO: string, lang: Lang = "ar"): Promise<GamesResponse> {
  const d = new Date(dateISO + "T12:00:00");
  const ds = ddmmyyyy(d);
  const url = buildUrl("/games/", lang, { sports: "1", showOdds: "false", startDate: ds, endDate: ds });
  const data = await cachedFetch<GamesResponse>(url, \`games:\${lang}:\${dateISO}\`, 30_000);
  return { games: data.games ?? [], competitions: data.competitions ?? [], liveGamesCount: data.liveGamesCount ?? 0 };
}

export async function getLiveGames(lang: Lang = "ar"): Promise<GamesResponse> {
  const url = buildUrl("/games/current/", lang, { sports: "1", onlyLiveGames: "true" });
  const data = await cachedFetch<GamesResponse>(url, \`games:live:\${lang}\`, 15_000);
  return { games: data.games ?? [], competitions: data.competitions ?? [], liveGamesCount: data.liveGamesCount ?? data.games?.length ?? 0 };
}

export async function getGame(gameId: number, lang: Lang = "ar") {
  const url = buildUrl("/game/", lang, { gameId: String(gameId) });
  return cachedFetch<GameDetailResponse>(url, \`game:\${lang}:\${gameId}\`, 20_000);
}

export interface MatchStatItem {
  id: number; name: string; competitorId: number;
  value: string; valuePercentage?: number; isMajor?: boolean;
  categoryName?: string; categoryId?: number;
}
export async function getMatchStats(gameId: number, lang: Lang = "ar") {
  const url = buildUrl("/game/stats/", lang, { games: String(gameId) });
  return cachedFetch<{ statistics: MatchStatItem[] }>(url, \`stats:\${lang}:\${gameId}\`, 20_000);
}

export async function getStandings(competitionId: number, lang: Lang = "ar") {
  const url = buildUrl("/standings/", lang, { competitions: String(competitionId), live: "false" });
  return cachedFetch<StandingsResponse>(url, \`standings:\${lang}:\${competitionId}\`, 300_000);
}

export interface ScorerRow {
  position: number;
  gameStatsValue?: number;
  secondaryStatName?: string;
  entity: { id: number; name: string; shortName?: string; competitorId?: number; positionName?: string; imageVersion?: number };
  stats?: { value: number }[];
}
export async function getTopScorers(competitionId: number, lang: Lang = "ar") {
  const url = buildUrl("/stats/", lang, { competitions: String(competitionId), competitionStatType: "1" });
  return cachedFetch<{ stats?: { athletesStats?: { rows: ScorerRow[] }[] } }>(url, \`scorers:\${lang}:\${competitionId}\`, 600_000);
}

export interface NewsItem {
  id: number; publishDate: string; title: string;
  image?: string; url: string; source?: { name?: string };
}
export async function getNews(lang: Lang = "ar") {
  const url = buildUrl("/news/", lang, { sports: "1" });
  return cachedFetch<{ news: NewsItem[] }>(url, \`news:\${lang}\`, 300_000);
}

export interface TeamInfo {
  id: number; name: string; color?: string; imageVersion?: number;
  mainCompetitionId?: number; competitions?: { id: number; name: string }[];
}
export async function getTeam(teamId: number, lang: Lang = "ar") {
  const url = buildUrl("/competitors/", lang, { competitors: String(teamId) });
  return cachedFetch<{ competitors: TeamInfo[]; competitions?: Competition[] }>(url, \`team:\${lang}:\${teamId}\`, 600_000);
}

export interface AthleteInfo {
  id: number; name: string; shortName?: string; age?: number;
  position?: { id: number; name: string };
  formationPosition?: { id: number; name: string };
  nationalityName?: string; nationalityId?: number;
  clubId?: number; nationalTeamId?: number; imageVersion?: number;
}
export async function getAthlete(athleteId: number, lang: Lang = "ar") {
  const url = buildUrl("/athletes/", lang, { athletes: String(athleteId) });
  return cachedFetch<{ athletes: AthleteInfo[]; competitors?: Competitor[] }>(url, \`athlete:\${lang}:\${athleteId}\`, 600_000);
}

export async function search(term: string, lang: Lang = "ar") {
  const url = buildUrl("/search/", lang, { query: term, sports: "1" });
  try {
    const data = await cachedFetch<{ results?: { competitors?: Competitor[]; competitions?: Competition[] }; competitors?: Competitor[]; competitions?: Competition[] }>(url, \`search:\${lang}:\${term.toLowerCase()}\`, 600_000);
    return { competitors: data.results?.competitors ?? data.competitors ?? [], competitions: data.results?.competitions ?? data.competitions ?? [] };
  } catch { return { competitors: [], competitions: [] }; }
}
`);

/* ================================================================== */
/*  Types مشتركة                                                      */
/* ================================================================== */
writeFile("src/lib/shared.ts", `const IMG = "https://imagecache.365scores.com/image/upload";

export function competitorLogo(id: number, v = 1, size = 80) {
  return \`\${IMG}/f_png,w_\${size},h_\${size},c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/v\${v}/Competitors/\${id}\`;
}
export function competitionLogo(id: number, v = 1, size = 80) {
  return \`\${IMG}/f_png,w_\${size},h_\${size},c_limit,q_auto:eco,dpr_2,d_Competitions:default1.png/v\${v}/Competitions/\${id}\`;
}
export function countryFlag(id: number, v = 1, size = 48) {
  return \`\${IMG}/f_png,w_\${size},h_\${size},c_limit,q_auto:eco,dpr_2/v\${v}/Countries/\${id}\`;
}
export function athleteImage(id: number, v = 0, size = 80) {
  return \`\${IMG}/f_png,w_\${size},h_\${size},c_limit,q_auto:eco,dpr_2,d_Athletes:default1.png/v\${v}/Athletes/\${id}\`;
}

export function isLive(statusGroup: number) { return statusGroup === 3; }
export function isEnded(statusGroup: number) { return statusGroup === 4; }
export function isScheduled(statusGroup: number) { return statusGroup === 1 || statusGroup === 2; }

export function formatKickoff(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export interface Competitor {
  id: number; name: string; symbolicName?: string; score?: number;
  imageVersion?: number; color?: string; isWinner?: boolean; nameForURL?: string;
}

export interface GameEvent {
  competitorId: number; gameTime?: number; gameTimeDisplay?: string; addedTime?: number;
  isMajor?: boolean; playerId?: number; player?: string;
  eventType?: { id: number; name: string; subTypeId?: number; subTypeName?: string };
}

export interface RefereeInfo {
  id: number; name: string; countryId?: number; nameForURL?: string;
}

export interface Game {
  id: number; sportId: number; competitionId: number;
  competitionDisplayName?: string; roundName?: string; roundNum?: number;
  startTime: string; statusGroup: number;
  statusText?: string; shortStatusText?: string;
  gameTime?: number; gameTimeDisplay?: string;
  homeCompetitor: Competitor; awayCompetitor: Competitor;
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
  id: number; countryId?: number; name: string; nameForURL?: string;
  imageVersion?: number; color?: string; popularityRank?: number;
  totalGames?: number; liveGames?: number;
}

export interface GamesResponse {
  games: Game[]; competitions: Competition[]; liveGamesCount?: number;
}

export interface LineupPlayer {
  id?: number; status?: number; statusText?: string;
  position?: { id: number; name: string; shortName?: string };
  formation?: { fieldPosition: number; fieldLine: number };
  yardFormation?: { line: number; fieldPosition: number; fieldLine: number; fieldSide: number };
  competitorId?: number; competitor?: { id: number };
  jerseyNumber?: number; athleteId?: number; ranking?: number; name?: string;
}

export interface Lineup {
  status?: string; formation?: string; hasFieldPositions?: boolean;
  members?: LineupPlayer[];
}

export interface Member {
  id: number; name?: string; shortName?: string;
  athleteId?: number; competitorId?: number;
  jerseyNumber?: number; imageVersion?: number;
}

export interface GameDetailResponse {
  game: (Game & {
    homeCompetitor: Competitor & { lineups?: Lineup };
    awayCompetitor: Competitor & { lineups?: Lineup };
    members?: Member[];
  }) | null;
}

export interface StandingRow {
  competitor: Competitor;
  gamePlayed: number; gamesWon: number; gamesLost: number;
  gamesEven: number; for: number; against: number;
  ratio: number; points: number;
  position?: number; groupName?: string;
}

export interface StandingsResponse {
  standings: {
    competitionId: number; displayName?: string;
    rows: StandingRow[];
  }[];
}

export interface FavoriteItem {
  id: number; type: string; entityId: number; name: string;
  imageVersion?: number; meta?: Record<string, unknown> | null;
}

export interface MatchStatItem {
  id: number; name: string; competitorId: number;
  value: string; valuePercentage?: number; isMajor?: boolean;
  categoryName?: string; categoryId?: number;
}

export interface NewsItem {
  id: number; publishDate: string; title: string;
  image?: string; url: string; source?: { name?: string };
}
`);

/* ================================================================== */
/*  الترجمات                                                         */
/* ================================================================== */
writeFile("src/lib/i18n.ts", `export type Lang = "ar" | "en";

export const dict = {
  ar: {
    appTagline: "نتائج لحظة بلحظة", matches: "المباريات", live: "مباشر",
    favorites: "المفضلة", news: "الأخبار", search: "بحث",
    all: "الكل", liveNow: "مباشر الآن", today: "اليوم", yesterday: "أمس", tomorrow: "غداً",
    noMatchesDay: "لا توجد مباريات في هذا اليوم", noLiveMatches: "لا توجد مباريات مباشرة الآن",
    tryAnotherDay: "جرّب يومًا آخر أو عُد لاحقًا",
    summary: "ملخص", lineups: "التشكيل", standings: "الترتيب", stats: "إحصائيات",
    scorers: "الهدّافون", matchEvents: "أحداث المباراة", venueInfo: "معلومات المباراة",
    capacity: "السعة", spectators: "متفرّج", competition: "البطولة", round: "الجولة",
    noExtraDetails: "لا توجد تفاصيل إضافية متاحة بعد", substitutes: "البدلاء",
    coach: "المدرب", noStandings: "لا يوجد ترتيب متاح لهذه البطولة",
    noStats: "لا توجد إحصائيات متاحة لهذه المباراة",
    noScorers: "لا يوجد هدّافون متاحون لهذه البطولة",
    advancedPositions: "مراكز متقدمة", relegationZone: "منطقة الهبوط",
    team: "الفريق", played: "لعب", won: "ف", drawn: "ت", lost: "خ",
    points: "نقاط", goals: "أهداف",
    searchPlaceholder: "ابحث عن فريق أو بطولة…",
    typeTwoChars: "اكتب حرفين على الأقل للبحث",
    searching: "جارٍ البحث…", competitions: "البطولات", teams: "الفرق",
    noFavorites: "لا توجد مفضلات بعد",
    addFavoritesHint: "أضف فرقك وبطولاتك المفضلة لمتابعتها بسهولة",
    searchAndAdd: "ابحث وأضف المفضلة",
    favoriteCompetitions: "البطولات المفضلة", favoriteTeams: "الفرق المفضلة",
    myFavoriteMatches: "مباريات المفضلة",
    login: "تسجيل الدخول", logout: "تسجيل الخروج",
    loginTitle: "سجّل دخولك",
    loginSubtitle: "أدخل بريدك لحفظ مفضّلاتك على كل أجهزتك",
    emailPlaceholder: "البريد الإلكتروني", namePlaceholder: "الاسم (اختياري)",
    continue: "متابعة", loginToFav: "سجّل الدخول لحفظ المفضلة بشكل دائم",
    welcome: "أهلاً", latestNews: "آخر الأخبار",
    noNews: "لا توجد أخبار متاحة حالياً", readMore: "اقرأ المزيد",
    age: "العمر", position: "المركز", nationality: "الجنسية",
    club: "النادي", playerInfo: "معلومات اللاعب", teamInfo: "معلومات الفريق",
    backHome: "العودة للرئيسية", loadFailed: "تعذّر تحميل البيانات",
    possession: "الاستحواذ", filterLeagues: "تصفية الدوريات",
    year: "سنة", goalScored: "هدف!",
    referee: "الحَكَم", matchReferee: "حَكَم المباراة",
    broadcast: "القنوات الناقلة", broadcastHint: "لا توجد قنوات متاحة",
    coachUnknown: "غير متاح",
  },
  en: {
    appTagline: "Live scores, instantly", matches: "Matches", live: "Live",
    favorites: "Favorites", news: "News", search: "Search",
    all: "All", liveNow: "Live now", today: "Today", yesterday: "Yesterday", tomorrow: "Tomorrow",
    noMatchesDay: "No matches on this day", noLiveMatches: "No live matches right now",
    tryAnotherDay: "Try another day or come back later",
    summary: "Summary", lineups: "Lineups", standings: "Standings",
    stats: "Stats", scorers: "Top Scorers", matchEvents: "Match events",
    venueInfo: "Venue info", capacity: "Capacity", spectators: "spectators",
    competition: "Competition", round: "Round",
    noExtraDetails: "No extra details available yet", substitutes: "Substitutes",
    coach: "Coach", noStandings: "No standings available for this competition",
    noStats: "No statistics available for this match",
    noScorers: "No scorers available for this competition",
    advancedPositions: "Qualification spots", relegationZone: "Relegation zone",
    team: "Team", played: "P", won: "W", drawn: "D", lost: "L",
    points: "Pts", goals: "Goals",
    searchPlaceholder: "Search for a team or competition…",
    typeTwoChars: "Type at least two letters to search",
    searching: "Searching…", competitions: "Competitions", teams: "Teams",
    noFavorites: "No favorites yet",
    addFavoritesHint: "Add your favorite teams and competitions",
    searchAndAdd: "Search and add favorites",
    favoriteCompetitions: "Favorite competitions", favoriteTeams: "Favorite teams",
    myFavoriteMatches: "Favorite matches",
    login: "Sign in", logout: "Sign out",
    loginTitle: "Sign in",
    loginSubtitle: "Enter your email to save favorites",
    emailPlaceholder: "Email address", namePlaceholder: "Name (optional)",
    continue: "Continue", loginToFav: "Sign in to save favorites",
    welcome: "Welcome", latestNews: "Latest news",
    noNews: "No news available", readMore: "Read more",
    age: "Age", position: "Position", nationality: "Nationality",
    club: "Club", playerInfo: "Player info", teamInfo: "Team info",
    backHome: "Back to home", loadFailed: "Failed to load data",
    possession: "Possession", filterLeagues: "Filter leagues",
    year: "yrs", goalScored: "GOAL!",
    referee: "Referee", matchReferee: "Match referee",
    broadcast: "Broadcasters", broadcastHint: "No broadcast info",
    coachUnknown: "Unknown",
  },
} as const;

export type TKey = keyof typeof dict.ar;

export function getLocale(lang: Lang) {
  return lang === "en" ? "en-US" : "ar-EG";
}
`);

/* ================================================================== */
/*  App Context                                                        */
/* ================================================================== */
writeFile("src/lib/app-context.tsx", `"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { dict, getLocale, type Lang, type TKey } from "@/lib/i18n";
import type { FavoriteItem } from "@/lib/shared";

type Theme = "dark" | "light";
type User = { email: string; name?: string | null } | null;

interface Ctx {
  lang: Lang; setLang: (l: Lang) => void; toggleLang: () => void;
  t: (k: TKey) => string; locale: string;
  theme: Theme; toggleTheme: () => void;
  user: User; login: (email: string, name?: string) => Promise<boolean>; logout: () => void;
  favorites: FavoriteItem[];
  isFav: (type: string, entityId: number) => boolean;
  toggleFav: (item: { type: string; entityId: number; name: string; imageVersion?: number; meta?: Record<string, unknown> }) => void;
  loginOpen: boolean; setLoginOpen: (v: boolean) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [theme, setTheme] = useState<Theme>("dark");
  const [user, setUser] = useState<User>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const sl = localStorage.getItem("es_lang") as Lang | null;
    const st = localStorage.getItem("es_theme") as Theme | null;
    const su = localStorage.getItem("es_user");
    if (sl) setLangState(sl);
    if (st) setTheme(st);
    if (su) { try { setUser(JSON.parse(su)); } catch {} }
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", lang);
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    html.setAttribute("data-theme", theme);
    localStorage.setItem("es_lang", lang);
    localStorage.setItem("es_theme", theme);
  }, [lang, theme]);

  const loadFavorites = useCallback(async (email: string) => {
    try {
      const res = await fetch(\`/api/favorites?email=\${encodeURIComponent(email)}\`);
      const data = await res.json();
      setFavorites(data.favorites ?? []);
    } catch { setFavorites([]); }
  }, []);

  useEffect(() => {
    if (user?.email) loadFavorites(user.email);
    else setFavorites([]);
  }, [user, loadFavorites]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggleLang = useCallback(() => setLangState((p) => (p === "ar" ? "en" : "ar")), []);
  const toggleTheme = useCallback(() => setTheme((p) => (p === "dark" ? "light" : "dark")), []);
  const t = useCallback((k: TKey) => dict[lang][k] ?? dict.ar[k] ?? k, [lang]);

  const login = useCallback(async (email: string, name?: string) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const u = { email: data.user.email, name: data.user.name };
      setUser(u); localStorage.setItem("es_user", JSON.stringify(u));
      setLoginOpen(false); return true;
    } catch { return false; }
  }, []);

  const logout = useCallback(() => {
    setUser(null); setFavorites([]); localStorage.removeItem("es_user");
  }, []);

  const isFav = useCallback(
    (type: string, entityId: number) => favorites.some((f) => f.type === type && f.entityId === entityId),
    [favorites],
  );

  const toggleFav = useCallback(async (item: { type: string; entityId: number; name: string; imageVersion?: number; meta?: Record<string, unknown> }) => {
    if (!user?.email) { setLoginOpen(true); return; }
    const email = user.email;
    const exists = favorites.some((f) => f.type === item.type && f.entityId === item.entityId);
    if (exists) {
      setFavorites((prev) => prev.filter((f) => !(f.type === item.type && f.entityId === item.entityId)));
      await fetch(\`/api/favorites?email=\${encodeURIComponent(email)}&type=\${item.type}&entityId=\${item.entityId}\`, { method: "DELETE" }).catch(() => {});
    } else {
      const optimistic: FavoriteItem = { id: Date.now(), type: item.type, entityId: item.entityId, name: item.name, imageVersion: item.imageVersion, meta: item.meta ?? null };
      setFavorites((prev) => [optimistic, ...prev]);
      await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, email }) }).catch(() => {});
    }
  }, [user, favorites]);

  return (
    <AppCtx.Provider value={{ lang, setLang, toggleLang, t, locale: getLocale(lang), theme, toggleTheme, user, login, logout, favorites, isFav, toggleFav, loginOpen, setLoginOpen }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
`);

/* ================================================================== */
/*  API Routes                                                         */
/* ================================================================== */
writeFile("src/app/api/auth/route.ts", `import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function isEmail(v: string) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v); }

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = body?.name ? String(body.name).trim() : null;
    if (!isEmail(email)) return Response.json({ error: "invalid" }, { status: 400 });
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length === 0) await db.insert(users).values({ email, name }).onConflictDoNothing();
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return Response.json({ user: rows[0] ?? { email, name } });
  } catch { return Response.json({ error: "err" }, { status: 500 }); }
}

export async function GET(req: Request) {
  const email = (new URL(req.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!isEmail(email)) return Response.json({ user: null });
  try {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return Response.json({ user: rows[0] ?? null });
  } catch { return Response.json({ user: null }); }
}
`);

writeFile("src/app/api/match-stats/[id]/route.ts", `import { getMatchStats, type Lang } from "@/lib/scores";
export const dynamic = "force-dynamic";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = Number(id);
  const lang = (new URL(req.url).searchParams.get("lang") as Lang) === "en" ? "en" : "ar";
  if (!Number.isFinite(gameId)) return Response.json({ statistics: [] });
  try { return Response.json(await getMatchStats(gameId, lang)); }
  catch { return Response.json({ statistics: [] }); }
}
`);

writeFile("src/app/api/news/route.ts", `import { getNews, type Lang } from "@/lib/scores";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const lang = (new URL(req.url).searchParams.get("lang") as Lang) === "en" ? "en" : "ar";
  try { return Response.json(await getNews(lang)); }
  catch { return Response.json({ news: [] }); }
}
`);

writeFile("src/app/api/scorers/route.ts", `import { getTopScorers, type Lang } from "@/lib/scores";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const competitionId = Number(new URL(req.url).searchParams.get("competitionId"));
  const lang = (new URL(req.url).searchParams.get("lang") as Lang) === "en" ? "en" : "ar";
  if (!Number.isFinite(competitionId)) return Response.json({ stats: {} });
  try { return Response.json(await getTopScorers(competitionId, lang)); }
  catch { return Response.json({ stats: {} }); }
}
`);

writeFile("src/app/api/team/[id]/route.ts", `import { getTeam, type Lang } from "@/lib/scores";
export const dynamic = "force-dynamic";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = Number(id);
  const lang = (new URL(req.url).searchParams.get("lang") as Lang) === "en" ? "en" : "ar";
  if (!Number.isFinite(teamId)) return Response.json({ competitors: [] });
  try { return Response.json(await getTeam(teamId, lang)); }
  catch { return Response.json({ competitors: [] }); }
}
`);

writeFile("src/app/api/player/[id]/route.ts", `import { getAthlete, type Lang } from "@/lib/scores";
export const dynamic = "force-dynamic";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const athleteId = Number(id);
  const lang = (new URL(req.url).searchParams.get("lang") as Lang) === "en" ? "en" : "ar";
  if (!Number.isFinite(athleteId)) return Response.json({ athletes: [] });
  try { return Response.json(await getAthlete(athleteId, lang)); }
  catch { return Response.json({ athletes: [] }); }
}
`);

writeFile("src/app/api/favorites/route.ts", `import { db } from "@/db";
import { favorites } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function email(req: Request) { return (new URL(req.url).searchParams.get("email") ?? "").trim().toLowerCase(); }

export async function GET(req: Request) {
  const userEmail = email(req);
  if (!userEmail) return Response.json({ favorites: [] });
  try {
    const rows = await db.select().from(favorites).where(eq(favorites.userEmail, userEmail)).orderBy(desc(favorites.createdAt));
    return Response.json({ favorites: rows });
  } catch { return Response.json({ favorites: [] }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userEmail = String(body?.email ?? "").trim().toLowerCase();
    const { type, entityId, name, imageVersion, meta } = body ?? {};
    if (!userEmail || !type || !entityId || !name) return Response.json({ error: "bad" }, { status: 400 });
    await db.insert(favorites).values({ userEmail, type, entityId: Number(entityId), name, imageVersion: imageVersion ?? 1, meta: meta ?? null }).onConflictDoNothing();
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "err" }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const userEmail = (sp.get("email") ?? "").trim().toLowerCase();
    const type = sp.get("type");
    const entityId = Number(sp.get("entityId"));
    if (!userEmail || !type || !Number.isFinite(entityId)) return Response.json({ error: "bad" }, { status: 400 });
    await db.delete(favorites).where(and(eq(favorites.userEmail, userEmail), eq(favorites.type, type), eq(favorites.entityId, entityId)));
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "err" }, { status: 500 }); }
}
`);

// باقي الـ API routes الموجودة (scores, game, search, standings, health)
writeFile("src/app/api/scores/route.ts", `import { getGamesByDate, getLiveGames, type Lang } from "@/lib/scores";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const date = sp.get("date");
  const live = sp.get("live") === "true";
  const lang = (sp.get("lang") as Lang) === "en" ? "en" : "ar";
  try {
    const data = live ? await getLiveGames(lang) : await getGamesByDate(date ?? new Date().toISOString().slice(0, 10), lang);
    return Response.json(data);
  } catch { return Response.json({ games: [], competitions: [] }); }
}
`);

writeFile("src/app/api/game/[id]/route.ts", `import { getGame, type Lang } from "@/lib/scores";
export const dynamic = "force-dynamic";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = Number(id);
  const lang = (new URL(req.url).searchParams.get("lang") as Lang) === "en" ? "en" : "ar";
  if (!Number.isFinite(gameId)) return Response.json({ error: "bad" }, { status: 400 });
  try { return Response.json(await getGame(gameId, lang)); }
  catch { return Response.json({ error: "err" }); }
}
`);

writeFile("src/app/api/standings/route.ts", `import { getStandings, type Lang } from "@/lib/scores";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const competitionId = Number(sp.get("competitionId"));
  const lang = (sp.get("lang") as Lang) === "en" ? "en" : "ar";
  if (!Number.isFinite(competitionId)) return Response.json({ standings: [] });
  try { return Response.json(await getStandings(competitionId, lang)); }
  catch { return Response.json({ standings: [] }); }
}
`);

writeFile("src/app/api/search/route.ts", `import { search, type Lang } from "@/lib/scores";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim();
  const lang = (sp.get("lang") as Lang) === "en" ? "en" : "ar";
  if (q.length < 2) return Response.json({ competitors: [], competitions: [] });
  try { return Response.json(await search(q, lang)); }
  catch { return Response.json({ competitors: [], competitions: [] }); }
}
`);

writeFile("src/app/api/health/route.ts", `import { db } from "@/db";
import { sql } from "drizzle-orm";
export const dynamic = "force-dynamic";
export async function GET() {
  try { await db.execute(sql\`select 1\`); return Response.json({ ok: true }); }
  catch { return Response.json({ ok: false }, { status: 500 }); }
}
`);

/* ================================================================== */
/*  الصفحات                                                            */
/* ================================================================== */
writeFile("src/app/layout.tsx", `import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/app-context";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });

export const metadata: Metadata = {
  title: "Elsayad Scores | السياد سكورز",
  description: "نتائج المباريات المباشرة، التشكيلات، الإحصائيات والأخبار لحظة بلحظة",
  applicationName: "Elsayad Scores",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#060912", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" className={cairo.variable}>
      <body className="antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
`);

writeFile("src/app/page.tsx", `"use client";
import { useState } from "react";
import Header from "@/components/Header";
import BottomNav, { type Tab } from "@/components/BottomNav";
import MatchesView from "@/components/MatchesView";
import FavoritesView from "@/components/FavoritesView";
import SearchView from "@/components/SearchView";
import NewsView from "@/components/NewsView";
import LoginModal from "@/components/LoginModal";

export default function Home() {
  const [tab, setTab] = useState<Tab>("matches");
  const [liveCount, setLiveCount] = useState(0);
  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-24">
      <Header liveCount={liveCount} />
      <main key={tab} className="animate-fadeUp">
        {tab === "matches" && <MatchesView liveOnly={false} onLiveCount={setLiveCount} />}
        {tab === "live" && <MatchesView liveOnly onLiveCount={setLiveCount} />}
        {tab === "favorites" && <FavoritesView onGoSearch={() => setTab("search")} />}
        {tab === "news" && <NewsView />}
        {tab === "search" && <SearchView />}
      </main>
      <BottomNav active={tab} onChange={setTab} />
      <LoginModal />
    </div>
  );
}
`);

writeFile("src/app/team/[id]/page.tsx", `import TeamPage from "@/components/TeamPage";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeamPage teamId={Number(id)} />;
}
`);

writeFile("src/app/player/[id]/page.tsx", `import PlayerPage from "@/components/PlayerPage";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlayerPage playerId={Number(id)} />;
}
`);

/* ================================================================== */
/*  المكونات                                                           */
/* ================================================================== */
writeFile("src/components/Header.tsx", `"use client";
import { useApp } from "@/lib/app-context";
export default function Header({ liveCount }: { liveCount: number }) {
  const { t, theme, toggleTheme, lang, toggleLang, user, logout, setLoginOpen } = useApp();
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2.5">
        <div className="relative h-10 w-10 shrink-0">
          <div className="brand-gradient absolute inset-0 rounded-xl opacity-40 blur-md" />
          <img src="/logo.png" alt="ES" className="relative h-10 w-10 rounded-xl object-cover" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-black leading-none text-[var(--text)]">
            Elsayad <span className="text-brand-gradient">Scores</span>
          </h1>
          <p className="text-[11px] text-faint">{t("appTagline")}</p>
        </div>
        {liveCount > 0 && (
          <span className="live-dot flex items-center gap-1.5 rounded-full bg-[var(--color-live)]/15 px-2.5 py-1 text-xs font-bold text-[var(--color-live)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-live)]" />
            {liveCount}
          </span>
        )}
        <button onClick={toggleLang} className="icon-wiggle flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-black text-[var(--text)]">
          {lang === "ar" ? "EN" : "ع"}
        </button>
        <button onClick={toggleTheme} className="icon-wiggle flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text)]">
          {theme === "dark" ? "🌙" : "☀️"}
        </button>
        {user ? (
          <button onClick={logout} className="flex h-9 items-center gap-1.5 rounded-full bg-[var(--color-brand)]/15 px-2.5 text-[var(--color-brand)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand)] text-xs font-black text-[#04130f]">
              {(user.name || user.email)[0].toUpperCase()}
            </span>
          </button>
        ) : (
          <button onClick={() => setLoginOpen(true)} className="brand-gradient flex h-9 items-center rounded-full px-3 text-xs font-black text-[#04130f]">
            {t("login")}
          </button>
        )}
      </div>
    </header>
  );
}
`);

writeFile("src/components/BottomNav.tsx", `"use client";
import { useApp } from "@/lib/app-context";
export type Tab = "matches" | "live" | "favorites" | "news" | "search";
const ITEMS: { id: Tab; label: "matches" | "live" | "favorites" | "news" | "search"; icon: string }[] = [
  { id: "matches", label: "matches", icon: "📅" },
  { id: "live", label: "live", icon: "📡" },
  { id: "favorites", label: "favorites", icon: "⭐" },
  { id: "news", label: "news", icon: "📰" },
  { id: "search", label: "search", icon: "🔍" },
];
export default function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const { t } = useApp();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1 py-1.5">
        {ITEMS.map((it) => {
          const on = active === it.id;
          return (
            <button key={it.id} onClick={() => onChange(it.id)} className={\`icon-wiggle relative flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 \${on ? "text-[var(--color-brand)]" : "text-faint"}\`}>
              {on && <span className="brand-gradient absolute -top-0.5 h-1 w-8 rounded-full" />}
              <span className={\`text-2xl transition-transform \${on ? "scale-110" : ""}\`}>{it.icon}</span>
              <span className="text-[10px] font-bold">{t(it.label)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
`);

writeFile("src/components/DateBar.tsx", `"use client";
import { useApp } from "@/lib/app-context";
function toISO(d: Date) { return d.toISOString().slice(0, 10); }
export default function DateBar({ selected, onSelect }: { selected: string; onSelect: (iso: string) => void }) {
  const { t, locale } = useApp();
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const days: Date[] = [];
  for (let i = -3; i <= 5; i++) { const d = new Date(today); d.setDate(today.getDate() + i); days.push(d); }
  const todayISO = toISO(today);
  const tomorrowISO = toISO(new Date(today.getTime() + 86400000));
  const yesterdayISO = toISO(new Date(today.getTime() - 86400000));
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-2.5">
      {days.map((d) => {
        const iso = toISO(d);
        const active = iso === selected;
        let label = d.toLocaleDateString(locale, { weekday: "short" });
        if (iso === todayISO) label = t("today");
        else if (iso === tomorrowISO) label = t("tomorrow");
        else if (iso === yesterdayISO) label = t("yesterday");
        return (
          <button key={iso} onClick={() => onSelect(iso)} className={\`relative flex min-w-[62px] flex-col items-center rounded-2xl px-3 py-2 transition-all duration-300 \${active ? "brand-gradient scale-105 text-[#04130f] shadow-lg shadow-[var(--color-brand)]/30" : "glass text-dim"}\`}>
            <span className="text-[11px] font-bold opacity-90">{label}</span>
            <span className="text-xl font-black leading-tight">{d.toLocaleDateString(locale, { day: "numeric" })}</span>
            <span className="text-[10px] opacity-80">{d.toLocaleDateString(locale, { month: "short" })}</span>
          </button>
        );
      })}
    </div>
  );
}
`);

writeFile("src/components/MatchCard.tsx", `"use client";
import Link from "next/link";
import { competitorLogo, formatKickoff, isLive, isScheduled, type Game } from "@/lib/shared";
import TeamLogo from "./TeamLogo";

function Side({ name, id, v, color, bold }: { name: string; id: number; v?: number; color?: string; bold?: boolean }) {
  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <TeamLogo src={competitorLogo(id, v ?? 1, 56)} alt={name} size={34} color={color} />
      <span className={\`truncate text-[13px] sm:text-sm \${bold ? "font-extrabold text-[var(--text)]" : "font-medium text-dim"}\`}>{name}</span>
    </div>
  );
}

export default function MatchCard({ game }: { game: Game }) {
  const live = isLive(game.statusGroup);
  const scheduled = isScheduled(game.statusGroup);
  const home = game.homeCompetitor;
  const away = game.awayCompetitor;
  const homeWin = game.winner === 1;
  const awayWin = game.winner === 2;
  return (
    <Link href={\`/match/\${game.id}\`} className="glass card-hover block rounded-2xl px-3 py-3">
      <div className="flex items-center gap-2">
        <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1">
          {live ? (
            <span className="live-dot rounded-full bg-[var(--color-live)] px-2 py-0.5 text-[11px] font-bold text-white">
              {game.gameTimeDisplay || game.shortStatusText || "•"}
            </span>
          ) : scheduled ? (
            <span className="text-[13px] font-bold text-[var(--text)]">{formatKickoff(game.startTime)}</span>
          ) : (
            <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-faint">{game.shortStatusText || "—"}</span>
          )}
        </div>
        <div className="h-9 w-px bg-[var(--border)]" />
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <Side name={home.name} id={home.id} v={home.imageVersion} color={home.color} bold={homeWin} />
          <div className="flex shrink-0 items-center justify-center">
            {scheduled ? (
              <span className="text-faint text-sm font-bold">VS</span>
            ) : (
              <div className={\`flex items-center gap-1 rounded-lg px-2 py-1 text-base font-black tabular-nums \${live ? "text-[var(--color-live)]" : "text-[var(--text)]"}\`}>
                <span className={homeWin ? "" : "opacity-70"}>{home.score ?? 0}</span>
                <span className="text-faint">-</span>
                <span className={awayWin ? "" : "opacity-70"}>{away.score ?? 0}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Side name={away.name} id={away.id} v={away.imageVersion} color={away.color} bold={awayWin} />
          </div>
        </div>
      </div>
    </Link>
  );
}
`);

writeFile("src/components/TeamLogo.tsx", `"use client";
import { useState } from "react";
export default function TeamLogo({ src, alt, size = 40, color, fallbackText }: { src: string; alt: string; size?: number; color?: string; fallbackText?: string }) {
  const [err, setErr] = useState(false);
  const initials = fallbackText ?? alt.split(" ").map((w) => w[0]).slice(0, 2).join("");
  if (err) {
    return (
      <div className="flex items-center justify-center rounded-full font-bold text-white shrink-0" style={{ width: size, height: size, background: color ? \`linear-gradient(135deg, \${color}, #0a0e1a)\` : "linear-gradient(135deg,#1a2138,#0a0e1a)", fontSize: size * 0.36, border: "1px solid rgba(255,255,255,0.08)" }}>
        {initials}
      </div>
    );
  }
  return <img src={src} alt={alt} width={size} height={size} loading="lazy" onError={() => setErr(true)} className="object-contain shrink-0" style={{ width: size, height: size }} />;
}
`);

writeFile("src/components/CompetitionGroup.tsx", `"use client";
import { useState } from "react";
import TeamLogo from "./TeamLogo";
import MatchCard from "./MatchCard";
import { competitionLogo, type Competition, type Game } from "@/lib/shared";
export default function CompetitionGroup({ competition, games, index = 0 }: { competition?: Competition; games: Game[]; index?: number }) {
  const [open, setOpen] = useState(true);
  const liveCount = games.filter((g) => g.statusGroup === 3).length;
  const name = competition?.name ?? games[0]?.competitionDisplayName ?? "—";
  const accent = competition?.color || "#00e5a0";
  return (
    <section className="animate-fadeUp overflow-hidden rounded-2xl" style={{ animationDelay: \`\${index * 0.04}s\` }}>
      <button onClick={() => setOpen((o) => !o)} className="glass relative flex w-full items-center gap-3 px-3 py-2.5 text-start">
        <span className="absolute inset-y-2 start-0 w-1 rounded-full" style={{ background: accent }} />
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: \`\${accent}1f\` }}>
          <TeamLogo src={competitionLogo(competition?.id ?? 0, competition?.imageVersion ?? 1, 48)} alt={name} size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-extrabold text-[var(--text)]">{name}</p>
        </div>
        {liveCount > 0 && <span className="live-dot rounded-full bg-[var(--color-live)] px-2 py-0.5 text-[10px] font-bold text-white">{liveCount}</span>}
        <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-bold text-dim">{games.length}</span>
        <svg className={\`h-4 w-4 text-faint transition-transform duration-300 \${open ? "rotate-180" : ""}\`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="stagger mt-2 flex flex-col gap-2">
          {games.map((g) => <MatchCard key={g.id} game={g} />)}
        </div>
      )}
    </section>
  );
}
`);

writeFile("src/components/MatchesView.tsx", `"use client";
import { useEffect, useMemo, useState } from "react";
import DateBar from "./DateBar";
import CompetitionGroup from "./CompetitionGroup";
import MatchCard from "./MatchCard";
import { useApp } from "@/lib/app-context";
import type { Competition, Game, GamesResponse } from "@/lib/shared";
function todayISO() { const d = new Date(); d.setHours(12, 0, 0, 0); return d.toISOString().slice(0, 10); }
export default function MatchesView({ liveOnly, onLiveCount }: { liveOnly: boolean; onLiveCount?: (n: number) => void }) {
  const { t, lang, favorites } = useApp();
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState<GamesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlyLive, setOnlyLive] = useState(false);
  const [leagueFilter, setLeagueFilter] = useState<number | null>(null);
  const favTeamIds = useMemo(() => favorites.filter((f) => f.type === "team").map((f) => f.entityId), [favorites]);
  const favCompIds = useMemo(() => favorites.filter((f) => f.type === "competition").map((f) => f.entityId), [favorites]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = liveOnly ? \`/api/scores?live=true&lang=\${lang}\` : \`/api/scores?date=\${date}&lang=\${lang}\`;
    const fetchData = () => fetch(url).then((r) => r.json()).then((d: GamesResponse) => { if (!cancelled) { setData(d); onLiveCount?.(d.liveGamesCount ?? 0); } }).catch(() => { if (!cancelled) setData({ games: [], competitions: [] }); }).finally(() => { if (!cancelled) setLoading(false); });
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [date, liveOnly, lang]);
  const compMap = useMemo(() => { const m = new Map<number, Competition>(); data?.competitions.forEach((c) => m.set(c.id, c)); return m; }, [data]);
  const favGames = useMemo(() => { if (!data) return []; return data.games.filter((g) => favTeamIds.includes(g.homeCompetitor.id) || favTeamIds.includes(g.awayCompetitor.id)); }, [data, favTeamIds]);
  const grouped = useMemo(() => {
    if (!data) return [];
    let games = data.games;
    if (onlyLive && !liveOnly) games = games.filter((g) => g.statusGroup === 3);
    if (leagueFilter) games = games.filter((g) => g.competitionId === leagueFilter);
    const byComp = new Map<number, Game[]>();
    for (const g of games) { if (!byComp.has(g.competitionId)) byComp.set(g.competitionId, []); byComp.get(g.competitionId)!.push(g); }
    const arr = Array.from(byComp.entries()).map(([cid, gs]) => ({ competition: compMap.get(cid), games: gs.sort((a, b) => { const la = a.statusGroup === 3 ? 0 : 1; const lb = b.statusGroup === 3 ? 0 : 1; if (la !== lb) return la - lb; return a.startTime.localeCompare(b.startTime); }) }));
    arr.sort((a, b) => { const fa = favCompIds.includes(a.competition?.id ?? -1) ? 0 : 1; const fb = favCompIds.includes(b.competition?.id ?? -1) ? 0 : 1; if (fa !== fb) return fa - fb; const la = a.games.some((g) => g.statusGroup === 3) ? 0 : 1; const lb = b.games.some((g) => g.statusGroup === 3) ? 0 : 1; if (la !== lb) return la - lb; return (b.competition?.popularityRank ?? 0) - (a.competition?.popularityRank ?? 0); });
    return arr;
  }, [data, onlyLive, liveOnly, leagueFilter, compMap, favCompIds]);
  const leagueChips = useMemo(() => { if (!data) return []; return [...(data.competitions ?? [])].sort((a, b) => (b.popularityRank ?? 0) - (a.popularityRank ?? 0)).slice(0, 12); }, [data]);
  return (
    <div>
      {!liveOnly && <DateBar selected={date} onSelect={setDate} />}
      {!liveOnly && (
        <div className="flex gap-2 px-3 pb-1">
          <FilterChip active={!onlyLive} onClick={() => setOnlyLive(false)} label={t("all")} />
          <FilterChip active={onlyLive} onClick={() => setOnlyLive(true)} label={t("liveNow")} live />
        </div>
      )}
      {leagueChips.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-2">
          <Chip active={leagueFilter === null} onClick={() => setLeagueFilter(null)}>{t("all")}</Chip>
          {leagueChips.map((c) => <Chip key={c.id} active={leagueFilter === c.id} onClick={() => setLeagueFilter(c.id)}>{c.name}</Chip>)}
        </div>
      )}
      <div className="px-3 pt-1">
        {loading && !data ? (
          <div className="flex flex-col gap-2 pt-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-2xl px-3 py-3"><div className="flex items-center gap-3"><div className="skeleton h-4 w-10 rounded" /><div className="h-9 w-px bg-[var(--border)]" /><div className="flex flex-1 items-center gap-2"><div className="skeleton h-8 w-8 rounded-full" /><div className="skeleton h-3 flex-1 rounded" /><div className="skeleton h-5 w-10 rounded" /><div className="skeleton h-3 flex-1 rounded" /><div className="skeleton h-8 w-8 rounded-full" /></div></div></div></div>)}</div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="animate-floaty mb-3 text-6xl">{liveOnly || onlyLive ? "📺" : "📅"}</div>
            <h3 className="mb-1 text-lg font-bold text-[var(--text)]">{liveOnly || onlyLive ? t("noLiveMatches") : t("noMatchesDay")}</h3>
            <p className="text-sm text-dim">{t("tryAnotherDay")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-1">
            {!liveOnly && favGames.length > 0 && !leagueFilter && !onlyLive && (
              <section className="animate-fadeUp">
                <div className="mb-2 flex items-center gap-2"><span className="text-[var(--color-accent)]">★</span><h2 className="text-sm font-black text-[var(--text)]">{t("myFavoriteMatches")}</h2></div>
                <div className="stagger flex flex-col gap-2">{favGames.map((g) => <MatchCard key={"fav-" + g.id} game={g} />)}</div>
              </section>
            )}
            {grouped.map((g, i) => <CompetitionGroup key={(g.competition?.id ?? i) + "-" + i} competition={g.competition} games={g.games} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}
function FilterChip({ active, onClick, label, live }: { active: boolean; onClick: () => void; label: string; live?: boolean }) {
  return (
    <button onClick={onClick} className={\`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all \${active ? (live ? "bg-[var(--color-live)] text-white" : "brand-gradient text-[#04130f]") : "glass text-dim"}\`}>
      {live && <span className={\`h-2 w-2 rounded-full \${active ? "bg-white live-dot" : "bg-[var(--color-live)]"}\`} />}
      {label}
    </button>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={\`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold transition-all \${active ? "bg-[var(--color-brand)] text-[#04130f]" : "glass text-dim"}\`}>{children}</button>;
}
`);

// باقي المكونات (Pitch, MatchDetail, StandingsTab, StatsTab, ScorersTab, NewsView, TeamPage, PlayerPage, LoginModal, FavoritesView, SearchView, Skeletons) - مختصرة للإيجاز
writeFile("src/components/Skeletons.tsx", `export function MatchSkeleton() { return <div className="glass rounded-2xl px-3 py-3"><div className="flex items-center gap-3"><div className="skeleton h-4 w-10 rounded" /><div className="h-9 w-px bg-[var(--border)]" /><div className="flex flex-1 items-center gap-2"><div className="skeleton h-8 w-8 rounded-full" /><div className="skeleton h-3 flex-1 rounded" /><div className="skeleton h-5 w-10 rounded" /><div className="skeleton h-3 flex-1 rounded" /><div className="skeleton h-8 w-8 rounded-full" /></div></div></div>; }
export function ListSkeleton({ count = 6 }: { count?: number }) { return <div className="flex flex-col gap-2 pt-2"><div className="skeleton mb-1 h-10 w-full rounded-xl" />{Array.from({ length: count }).map((_, i) => <MatchSkeleton key={i} />)}</div>; }
`);

writeFile("src/components/LoginModal.tsx", `"use client";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
export default function LoginModal() {
  const { loginOpen, setLoginOpen, login, t } = useApp();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  if (!loginOpen) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) { setErr("invalid"); return; }
    setLoading(true); const ok = await login(email.trim(), name.trim() || undefined); setLoading(false);
    if (!ok) setErr(t("loadFailed"));
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setLoginOpen(false)}>
      <div className="glass animate-bounceIn w-full max-w-md rounded-t-3xl border-x-0 border-b-0 p-6 sm:rounded-3xl sm:border" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="brand-gradient mb-3 flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl"><span className="text-2xl font-black text-[#04130f]">ES</span></div>
          <h2 className="text-xl font-black text-[var(--text)]">{t("loginTitle")}</h2>
          <p className="mt-1 text-sm text-dim">{t("loginSubtitle")}</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} autoFocus className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--color-brand)]" />
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--color-brand)]" />
          {err && <p className="text-xs text-[var(--color-live)]">{err}</p>}
          <button type="submit" disabled={loading} className="brand-gradient w-full rounded-xl py-3 text-sm font-black text-[#04130f] disabled:opacity-60">{loading ? "..." : t("continue")}</button>
        </form>
      </div>
    </div>
  );
}
`);

// ملاحظة: باقي المكونات (Pitch, MatchDetail, StandingsTab, StatsTab, ScorersTab, NewsView, TeamPage, PlayerPage, FavoritesView, SearchView) طويلة جداً.
// لأن السكربت قد يكون كبير جداً، نكتفي بإنشاء الملفات الأساسية وبعدها تشغل السكربت ونكمل الباقي يدوياً من الملفات الموجودة في preview.

console.log("\\n✅ تم إنشاء الملفات الأساسية!");
console.log("\\n📋 الخطوات التالية:");
console.log("1) حدّث قاعدة البيانات: DATABASE_URL=\\"رابطك\\" npx drizzle-kit push");
console.log("2) انسخ باقي المكونات من الـ preview (Pitch, MatchDetail, StandingsTab, StatsTab, ScorersTab, NewsView, TeamPage, PlayerPage, FavoritesView, SearchView)");
console.log("3) شغّل: npm run build");
console.log("4) ارفع على GitHub: git add . && git commit -m \\"تحديث\\" && git push");
console.log("\\n🎉 Vercel سينشر التحديثات تلقائياً!");
