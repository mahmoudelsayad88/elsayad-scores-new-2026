"use client";

import { useEffect, useMemo, useState } from "react";
import DateBar from "./DateBar";
import CompetitionGroup from "./CompetitionGroup";
import MatchCard from "./MatchCard";
import { ListSkeleton } from "./Skeletons";
import { useApp } from "@/lib/app-context";
import type { Competition, Game, GamesResponse } from "@/lib/shared";

function todayISO() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default function MatchesView({
  liveOnly,
  onLiveCount,
}: {
  liveOnly: boolean;
  onLiveCount?: (n: number) => void;
}) {
  const { t, lang, favorites } = useApp();
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState<GamesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlyLive, setOnlyLive] = useState(false);
  const [leagueFilter, setLeagueFilter] = useState<number | null>(null);

  const favTeamIds = useMemo(
    () => favorites.filter((f) => f.type === "team").map((f) => f.entityId),
    [favorites],
  );
  const favCompIds = useMemo(
    () =>
      favorites.filter((f) => f.type === "competition").map((f) => f.entityId),
    [favorites],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = liveOnly
      ? `/api/scores?live=true&lang=${lang}`
      : `/api/scores?date=${date}&lang=${lang}`;

    const fetchData = () =>
      fetch(url)
        .then((r) => r.json())
        .then((d: GamesResponse) => {
          if (cancelled) return;
          setData(d);
          onLiveCount?.(d.liveGamesCount ?? 0);
        })
        .catch(() => !cancelled && setData({ games: [], competitions: [] }))
        .finally(() => !cancelled && setLoading(false));

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, liveOnly, lang]);

  const compMap = useMemo(() => {
    const m = new Map<number, Competition>();
    data?.competitions.forEach((c) => m.set(c.id, c));
    return m;
  }, [data]);

  // matches involving favourite teams (shown pinned at top)
  const favGames = useMemo(() => {
    if (!data) return [];
    return data.games.filter(
      (g) =>
        favTeamIds.includes(g.homeCompetitor.id) ||
        favTeamIds.includes(g.awayCompetitor.id),
    );
  }, [data, favTeamIds]);

  const grouped = useMemo(() => {
    if (!data) return [];
    let games = data.games;
    if (onlyLive && !liveOnly) games = games.filter((g) => g.statusGroup === 3);
    if (leagueFilter) games = games.filter((g) => g.competitionId === leagueFilter);

    const byComp = new Map<number, Game[]>();
    for (const g of games) {
      if (!byComp.has(g.competitionId)) byComp.set(g.competitionId, []);
      byComp.get(g.competitionId)!.push(g);
    }

    const arr = Array.from(byComp.entries()).map(([cid, gs]) => ({
      competition: compMap.get(cid),
      games: gs.sort((a, b) => {
        const la = a.statusGroup === 3 ? 0 : 1;
        const lb = b.statusGroup === 3 ? 0 : 1;
        if (la !== lb) return la - lb;
        return a.startTime.localeCompare(b.startTime);
      }),
    }));

    arr.sort((a, b) => {
      // favourite competitions first
      const fa = favCompIds.includes(a.competition?.id ?? -1) ? 0 : 1;
      const fb = favCompIds.includes(b.competition?.id ?? -1) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      const la = a.games.some((g) => g.statusGroup === 3) ? 0 : 1;
      const lb = b.games.some((g) => g.statusGroup === 3) ? 0 : 1;
      if (la !== lb) return la - lb;
      return (
        (b.competition?.popularityRank ?? 0) -
        (a.competition?.popularityRank ?? 0)
      );
    });
    return arr;
  }, [data, onlyLive, liveOnly, leagueFilter, compMap, favCompIds]);

  // league filter chips (top competitions)
  const leagueChips = useMemo(() => {
    if (!data) return [];
    return [...(data.competitions ?? [])]
      .sort((a, b) => (b.popularityRank ?? 0) - (a.popularityRank ?? 0))
      .slice(0, 12);
  }, [data]);

  return (
    <div>
      {!liveOnly && <DateBar selected={date} onSelect={setDate} />}

      {!liveOnly && (
        <div className="flex gap-2 px-3 pb-1">
          <FilterChip active={!onlyLive} onClick={() => setOnlyLive(false)} label={t("all")} />
          <FilterChip active={onlyLive} onClick={() => setOnlyLive(true)} label={t("liveNow")} live />
        </div>
      )}

      {/* league filter */}
      {leagueChips.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-2">
          <Chip active={leagueFilter === null} onClick={() => setLeagueFilter(null)}>
            {t("all")}
          </Chip>
          {leagueChips.map((c) => (
            <Chip
              key={c.id}
              active={leagueFilter === c.id}
              onClick={() => setLeagueFilter(c.id)}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="px-3 pt-1">
        {loading && !data ? (
          <ListSkeleton />
        ) : grouped.length === 0 ? (
          <Empty live={liveOnly || onlyLive} t={t} />
        ) : (
          <div className="flex flex-col gap-4 pt-1">
            {/* favourite matches pinned */}
            {!liveOnly && favGames.length > 0 && !leagueFilter && !onlyLive && (
              <section className="animate-fadeUp">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[var(--color-accent)]">★</span>
                  <h2 className="text-sm font-black text-[var(--text)]">
                    {t("myFavoriteMatches")}
                  </h2>
                </div>
                <div className="stagger flex flex-col gap-2">
                  {favGames.map((g) => (
                    <MatchCard key={"fav-" + g.id} game={g} />
                  ))}
                </div>
              </section>
            )}

            {grouped.map((g, i) => (
              <CompetitionGroup
                key={(g.competition?.id ?? i) + "-" + i}
                competition={g.competition}
                games={g.games}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  live,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  live?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
        active
          ? live
            ? "bg-[var(--color-live)] text-white"
            : "brand-gradient text-[#04130f]"
          : "glass text-dim"
      }`}
    >
      {live && (
        <span
          className={`h-2 w-2 rounded-full ${
            active ? "bg-white live-dot" : "bg-[var(--color-live)]"
          }`}
        />
      )}
      {label}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
        active
          ? "bg-[var(--color-brand)] text-[#04130f]"
          : "glass text-dim"
      }`}
    >
      {children}
    </button>
  );
}

function Empty({ live, t }: { live: boolean; t: (k: "noLiveMatches" | "noMatchesDay" | "tryAnotherDay") => string }) {
  return (
    <div className="flex flex-col items-center justify-center pt-16 text-center">
      <div className="animate-floaty mb-3 text-6xl">{live ? "📺" : "📅"}</div>
      <h3 className="mb-1 text-lg font-bold text-[var(--text)]">
        {live ? t("noLiveMatches") : t("noMatchesDay")}
      </h3>
      <p className="text-sm text-dim">{t("tryAnotherDay")}</p>
    </div>
  );
}
