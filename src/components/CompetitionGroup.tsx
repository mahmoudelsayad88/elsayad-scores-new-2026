"use client";

import { useState } from "react";
import TeamLogo from "./TeamLogo";
import MatchCard from "./MatchCard";
import { competitionLogo, type Competition, type Game } from "@/lib/shared";

export default function CompetitionGroup({
  competition,
  games,
  index = 0,
}: {
  competition?: Competition;
  games: Game[];
  index?: number;
}) {
  const [open, setOpen] = useState(true);
  const liveCount = games.filter((g) => g.statusGroup === 3).length;
  const name = competition?.name ?? games[0]?.competitionDisplayName ?? "—";
  const accent = competition?.color || "#00e5a0";

  return (
    <section
      className="animate-fadeUp overflow-hidden rounded-2xl"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="glass relative flex w-full items-center gap-3 px-3 py-2.5 text-start"
      >
        <span
          className="absolute inset-y-2 start-0 w-1 rounded-full"
          style={{ background: accent }}
        />
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `${accent}1f` }}
        >
          <TeamLogo
            src={competitionLogo(
              competition?.id ?? 0,
              competition?.imageVersion ?? 1,
              48,
            )}
            alt={name}
            size={24}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-extrabold text-[var(--text)]">
            {name}
          </p>
        </div>
        {liveCount > 0 && (
          <span className="live-dot rounded-full bg-[var(--color-live)] px-2 py-0.5 text-[10px] font-bold text-white">
            {liveCount}
          </span>
        )}
        <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-bold text-dim">
          {games.length}
        </span>
        <svg
          className={`h-4 w-4 text-faint transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="stagger mt-2 flex flex-col gap-2">
          {games.map((g) => (
            <MatchCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </section>
  );
}
