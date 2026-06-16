"use client";

import Link from "next/link";
import TeamLogo from "./TeamLogo";
import {
  competitorLogo,
  formatKickoff,
  isLive,
  isScheduled,
  type Game,
} from "@/lib/shared";

function Side({
  name,
  id,
  v,
  color,
  bold,
}: {
  name: string;
  id: number;
  v?: number;
  color?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <TeamLogo
        src={competitorLogo(id, v ?? 1, 56)}
        alt={name}
        size={34}
        color={color}
      />
      <span
        className={`truncate text-[13px] sm:text-sm ${
          bold ? "font-extrabold text-[var(--text)]" : "font-medium text-dim"
        }`}
      >
        {name}
      </span>
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
    <Link
      href={`/match/${game.id}`}
      className="glass card-hover block rounded-2xl px-3 py-3"
    >
      <div className="flex items-center gap-2">
        <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1">
          {live ? (
            <span className="live-dot rounded-full bg-[var(--color-live)] px-2 py-0.5 text-[11px] font-bold text-white">
              {game.gameTimeDisplay || game.shortStatusText || "•"}
            </span>
          ) : scheduled ? (
            <span className="text-[13px] font-bold text-[var(--text)]">
              {formatKickoff(game.startTime)}
            </span>
          ) : (
            <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-faint">
              {game.shortStatusText || "—"}
            </span>
          )}
        </div>

        <div className="h-9 w-px bg-[var(--border)]" />

        <div className="flex flex-1 items-center gap-2 min-w-0">
          <Side
            name={home.name}
            id={home.id}
            v={home.imageVersion}
            color={home.color}
            bold={homeWin}
          />

          <div className="flex shrink-0 items-center justify-center">
            {scheduled ? (
              <span className="text-faint text-sm font-bold">VS</span>
            ) : (
              <div
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-base font-black tabular-nums ${
                  live ? "text-[var(--color-live)]" : "text-[var(--text)]"
                }`}
              >
                <span className={homeWin ? "" : "opacity-70"}>
                  {home.score ?? 0}
                </span>
                <span className="text-faint">-</span>
                <span className={awayWin ? "" : "opacity-70"}>
                  {away.score ?? 0}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <Side
              name={away.name}
              id={away.id}
              v={away.imageVersion}
              color={away.color}
              bold={awayWin}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
