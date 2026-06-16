"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TeamLogo from "./TeamLogo";
import StandingsTab from "./StandingsTab";
import StatsTab from "./StatsTab";
import ScorersTab from "./ScorersTab";
import Pitch from "./Pitch";
import { useApp } from "@/lib/app-context";
import {
  competitorLogo,
  competitionLogo,
  formatKickoff,
  isLive,
  isScheduled,
  type GameDetailResponse,
  type GameEvent,
  type Lineup,
  type Member,
} from "@/lib/shared";

type DetailTab = "summary" | "stats" | "lineups" | "standings" | "scorers";

export default function MatchDetail({ data }: { data: GameDetailResponse }) {
  const { t, locale } = useApp();
  const game = data.game!;
  const [tab, setTab] = useState<DetailTab>("summary");

  const live = isLive(game.statusGroup);
  const scheduled = isScheduled(game.statusGroup);
  const home = game.homeCompetitor;
  const away = game.awayCompetitor;

  const members: Member[] = (game.members ?? []) as Member[];
  const memberById = useMemo(() => {
    const m = new Map<number, Member>();
    for (const mb of members) {
      if (mb.id != null) m.set(mb.id, mb);
    }
    return m;
  }, [members]);

  const goalEvents = (game.events ?? []).filter((e) => e.eventType?.id === 1);
  const homeLineup = (home as { lineups?: Lineup }).lineups;
  const awayLineup = (away as { lineups?: Lineup }).lineups;
  const hasLineups = !!(homeLineup?.members?.length || awayLineup?.members?.length);

  const tabs: { id: DetailTab; label: string; show: boolean }[] = [
    { id: "summary", label: t("summary"), show: true },
    { id: "stats", label: t("stats"), show: !scheduled },
    { id: "lineups", label: t("lineups"), show: hasLineups },
    { id: "standings", label: t("standings"), show: true },
    { id: "scorers", label: t("scorers"), show: true },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-16">
      {/* top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/90 px-3 py-3 backdrop-blur-xl">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text)]"
        >
          <svg className="h-5 w-5 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="flex flex-1 items-center justify-center gap-2">
          <TeamLogo src={competitionLogo(game.competitionId, 1, 40)} alt="" size={20} />
          <span className="truncate text-sm font-bold text-[var(--text)]">
            {game.competitionDisplayName}
          </span>
        </div>
        <div className="h-9 w-9" />
      </div>

      {/* scoreboard */}
      <div className="relative overflow-hidden">
        <div className="brand-gradient absolute inset-0 opacity-10" />
        <div className="relative px-4 py-6">
          <div className="grid grid-cols-3 items-center gap-2">
            <TeamColumn id={home.id} name={home.name} v={home.imageVersion} color={home.color} />

            <div className="flex flex-col items-center">
              {scheduled ? (
                <>
                  <span className="text-3xl font-black text-[var(--text)]">
                    {formatKickoff(game.startTime)}
                  </span>
                  <span className="mt-1 text-xs text-dim">
                    {new Date(game.startTime).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 text-4xl font-black tabular-nums text-[var(--text)] animate-popIn">
                    <span>{home.score ?? 0}</span>
                    <span className="text-faint">-</span>
                    <span>{away.score ?? 0}</span>
                  </div>
                  {live ? (
                    <span className="live-dot mt-2 rounded-full bg-[var(--color-live)] px-3 py-0.5 text-xs font-bold text-white">
                      {game.gameTimeDisplay || game.statusText || "•"}
                    </span>
                  ) : (
                    <span className="mt-2 rounded-full bg-[var(--surface-2)] px-3 py-0.5 text-xs font-semibold text-dim">
                      {game.statusText || "—"}
                    </span>
                  )}
                </>
              )}
            </div>

            <TeamColumn id={away.id} name={away.name} v={away.imageVersion} color={away.color} />
          </div>

          {goalEvents.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
              <div className="space-y-1 text-start">
                {goalEvents
                  .filter((e) => e.competitorId === home.id)
                  .map((e, i) => (
                    <GoalLine key={i} e={e} memberById={memberById} />
                  ))}
              </div>
              <div className="space-y-1 text-end">
                {goalEvents
                  .filter((e) => e.competitorId === away.id)
                  .map((e, i) => (
                    <GoalLine key={i} e={e} memberById={memberById} flip />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* tabs */}
      <div className="no-scrollbar sticky top-[57px] z-20 flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--bg)]/90 px-3 py-2 backdrop-blur-xl">
        {tabs
          .filter((tb) => tb.show)
          .map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                tab === tb.id
                  ? "brand-gradient text-[#04130f]"
                  : "text-dim hover:text-[var(--text)]"
              }`}
            >
              {tb.label}
            </button>
          ))}
      </div>

      <div className="px-3 py-4">
        {tab === "summary" && <Summary game={game} memberById={memberById} />}
        {tab === "stats" && (
          <StatsTab
            gameId={game.id}
            homeId={home.id}
            awayId={away.id}
            homeColor={home.color}
            awayColor={away.color}
          />
        )}
        {tab === "lineups" && (
          <div className="space-y-5">
            <Pitch
              homeLineup={homeLineup}
              awayLineup={awayLineup}
              memberById={memberById}
              homeColor={home.color}
              awayColor={away.color}
            />
            <LineupList title={home.name} lineup={homeLineup} memberById={memberById} />
            <LineupList title={away.name} lineup={awayLineup} memberById={memberById} />
          </div>
        )}
        {tab === "standings" && (
          <StandingsTab competitionId={game.competitionId} highlight={[home.id, away.id]} />
        )}
        {tab === "scorers" && <ScorersTab competitionId={game.competitionId} />}
      </div>
    </div>
  );
}

function TeamColumn({
  id,
  name,
  v,
  color,
}: {
  id: number;
  name: string;
  v?: number;
  color?: string;
}) {
  const { isFav, toggleFav } = useApp();
  const fav = isFav("team", id);
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Link href={`/team/${id}`}>
        <TeamLogo src={competitorLogo(id, v ?? 1, 96)} alt={name} size={64} color={color} />
      </Link>
      <Link href={`/team/${id}`} className="line-clamp-2 text-sm font-bold text-[var(--text)]">
        {name}
      </Link>
      <button
        onClick={() => toggleFav({ type: "team", entityId: id, name, imageVersion: v })}
        className={`icon-wiggle flex h-7 w-7 items-center justify-center rounded-full transition-all ${
          fav
            ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)] scale-110"
            : "bg-[var(--surface-2)] text-faint"
        }`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
        </svg>
      </button>
    </div>
  );
}

function playerName(id: number | undefined, memberById: Map<number, Member>) {
  if (id == null) return "";
  return memberById.get(id)?.shortName || memberById.get(id)?.name || "";
}

function GoalLine({
  e,
  memberById,
  flip,
}: {
  e: GameEvent;
  memberById: Map<number, Member>;
  flip?: boolean;
}) {
  const name = playerName(e.playerId, memberById) || "—";
  return (
    <div className={`flex items-center gap-1 text-dim ${flip ? "flex-row-reverse justify-end" : ""}`}>
      <span>⚽</span>
      <span className="font-medium">{name}</span>
      <span className="text-faint">{e.gameTimeDisplay}</span>
    </div>
  );
}

function eventIcon(e: GameEvent) {
  const id = e.eventType?.id;
  const sub = e.eventType?.subTypeId;
  if (id === 1) return "⚽";
  if (id === 2) return sub === 2 ? "🟥" : "🟨";
  if (id === 3) return "🔁";
  return "•";
}

function Summary({
  game,
  memberById,
}: {
  game: GameDetailResponse["game"];
  memberById: Map<number, Member>;
}) {
  const { t } = useApp();
  if (!game) return null;
  const events = (game.events ?? []).filter((e) => e.isMajor);

  return (
    <div className="space-y-4">
      {events.length > 0 && (
        <div className="glass animate-fadeUp rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-bold text-[var(--text)]">{t("matchEvents")}</h3>
          <div className="space-y-3">
            {events.map((e, i) => {
              const homeSide = e.competitorId === game.homeCompetitor.id;
              const name = playerName(e.playerId, memberById);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 ${homeSide ? "" : "flex-row-reverse text-end"}`}
                >
                  <span className="w-10 shrink-0 text-center text-xs font-bold text-faint">
                    {e.gameTimeDisplay}
                  </span>
                  <span className="text-lg">{eventIcon(e)}</span>
                  <span className="text-sm font-medium text-dim">
                    {name || e.eventType?.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(game.venue?.name || (game.officials && game.officials.length > 0)) && (
        <div className="glass animate-fadeUp rounded-2xl p-4 space-y-4">
          <h3 className="mb-3 text-sm font-bold text-[var(--text)]">{t("venueInfo")}</h3>
          {game.venue?.name && (
            <div className="flex items-center gap-3 text-sm text-dim">
              <span className="text-xl">🏟️</span>
              <div>
                <p className="font-semibold text-[var(--text)]">{game.venue.name}</p>
                {game.venue.capacity ? (
                  <p className="text-xs text-faint">
                    {t("capacity")}: {game.venue.capacity.toLocaleString()} {t("spectators")}
                  </p>
                ) : null}
              </div>
            </div>
          )}
          {game.officials && game.officials.length > 0 && (
            <div className="flex items-center gap-3 text-sm text-dim">
              <span className="text-xl">⚖️</span>
              <div>
                <p className="font-semibold text-[var(--text)]">{game.officials[0].name}</p>
                <p className="text-xs text-faint">{t("matchReferee")}</p>
              </div>
            </div>
          )}
          {game.tvNetworks && game.tvNetworks.length > 0 && (
            <div className="flex items-center gap-3 text-sm text-dim">
              <span className="text-xl">📺</span>
              <div className="flex flex-1 flex-wrap gap-2">
                {game.tvNetworks.slice(0, 6).map((tv) => (
                  <span
                    key={tv.id}
                    className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs font-semibold text-[var(--text)]"
                  >
                    {tv.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="glass animate-fadeUp rounded-2xl p-4 text-sm text-dim">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
          <span className="text-faint">{t("competition")}</span>
          <span className="font-semibold text-[var(--text)]">{game.competitionDisplayName}</span>
        </div>
        {game.roundName && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-faint">{t("round")}</span>
            <span className="font-semibold text-[var(--text)]">
              {game.roundName} {game.roundNum}
            </span>
          </div>
        )}
      </div>

      {events.length === 0 && !game.venue?.name && (
        <p className="pt-8 text-center text-sm text-faint">{t("noExtraDetails")}</p>
      )}
    </div>
  );
}

function LineupList({
  title,
  lineup,
  memberById,
}: {
  title: string;
  lineup?: Lineup;
  memberById: Map<number, Member>;
}) {
  const { t } = useApp();
  if (!lineup?.members?.length) return null;
  const starters = lineup.members.filter((m) => m.status === 1);
  const subs = lineup.members.filter((m) => m.status !== 1);

  const Row = ({ id, pos }: { id?: number; pos?: string }) => {
    const member = id != null ? memberById.get(id) : undefined;
    const content = (
      <div className="flex items-center gap-3 border-b border-[var(--border)] py-2 last:border-0">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-bold text-dim">
          {member?.jerseyNumber ?? "-"}
        </span>
        <span className="flex-1 text-sm font-medium text-[var(--text)]">
          {member?.name || member?.shortName || "—"}
        </span>
        {pos && <span className="text-[11px] text-faint">{pos}</span>}
      </div>
    );
    if (member?.athleteId) {
      return <Link href={`/player/${member.athleteId}`}>{content}</Link>;
    }
    return content;
  };

  return (
    <div className="glass animate-fadeUp rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text)]">{title}</h3>
        {lineup.formation && (
          <span className="rounded-md bg-[var(--color-brand)]/15 px-2 py-0.5 text-xs font-bold text-[var(--color-brand)]">
            {lineup.formation}
          </span>
        )}
      </div>
      <div>
        {starters.map((m, i) => (
          <Row key={i} id={m.id} pos={m.position?.name} />
        ))}
      </div>
      {subs.length > 0 && (
        <>
          <h4 className="mb-1 mt-3 text-xs font-bold text-dim">{t("substitutes")}</h4>
          {subs.map((m, i) => (
            <Row key={i} id={m.id} pos={m.position?.name} />
          ))}
        </>
      )}
    </div>
  );
}
