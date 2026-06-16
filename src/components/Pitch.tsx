"use client";

import Link from "next/link";
import { athleteImage, type Lineup, type Member } from "@/lib/shared";

/* Clamp horizontal position so players never get clipped on the edges. */
function clampLeft(pct: number) {
  return Math.max(12, Math.min(88, pct));
}

/* Scale avatar based on vertical depth (goalkeeper smaller, striker normal). */
function sizeForLine(line: number, maxLine: number) {
  return 44; // uniform size for clarity
}

function PlayerDot({
  member,
  color,
  top,
  left,
  delay,
  teamSide,
}: {
  member?: Member;
  color?: string;
  top: number;
  left: number;
  delay: number;
  teamSide: "home" | "away";
}) {
  const name = member?.shortName || member?.name || "";
  const jersey = member?.jerseyNumber;
  const athleteId = member?.athleteId;
  const imgVersion = member?.imageVersion ?? 0;
  const size = sizeForLine(0, 0);

  const avatar = athleteId ? (
    <img
      src={athleteImage(athleteId, imgVersion, 80)}
      alt={name}
      className="h-full w-full rounded-full object-cover"
      loading="lazy"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
        const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
        if (fallback) fallback.style.display = "flex";
      }}
    />
  ) : null;

  const fallback = (
    <div
      className="flex h-full w-full items-center justify-center rounded-full text-[11px] font-black text-white"
      style={{
        background: color
          ? `linear-gradient(135deg, ${color}, #0a0e1a)`
          : "linear-gradient(135deg,#00e5a0,#00b4d8)",
      }}
    >
      {jersey ?? "—"}
    </div>
  );

  const inner = (
    <div
      className="animate-popIn absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
      style={{ top: `${top}%`, left: `${clampLeft(left)}%`, animationDelay: `${delay}s` }}
    >
      <div
        className="relative rounded-full border-2 border-white/90 shadow-lg"
        style={{ width: size, height: size }}
      >
        {avatar}
        <div className="absolute inset-0" style={{ display: athleteId ? "none" : "flex" }}>
          {fallback}
        </div>
        {/* mini jersey number badge */}
        {jersey != null && (
          <span
            className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white shadow"
            style={{
              background: color || "#111",
              border: "1.5px solid white",
            }}
          >
            {jersey}
          </span>
        )}
      </div>
      <span
        className="max-w-[58px] truncate rounded bg-black/65 px-1 py-0.5 text-center text-[9px] font-semibold text-white"
        style={{
          // align label to team side so RTL/LTR stays readable
          [teamSide === "home" ? "marginInlineStart" : "marginInlineEnd"]: teamSide === "home" ? "-8px" : "0",
        }}
      >
        {name}
      </span>
    </div>
  );

  if (athleteId) {
    return <Link href={`/player/${athleteId}`}>{inner}</Link>;
  }
  return inner;
}

function placeTeam(
  lineup: Lineup | undefined,
  memberById: Map<number, Member>,
  color: string | undefined,
  half: "top" | "bottom",
  side: "home" | "away",
) {
  if (!lineup?.members?.length) return [];
  const starters = lineup.members.filter(
    (m) => m.status === 1 && m.yardFormation,
  );
  const maxLine = Math.max(...starters.map((m) => m.yardFormation!.line), 1);

  return starters.map((m, i) => {
    const yf = m.yardFormation!;
    const depth = ((yf.line - 1) / Math.max(maxLine - 1, 1)) * 40; // 0..40, leave margin
    const top = half === "bottom" ? 94 - depth - 4 : 6 + depth;
    // mirror horizontal for away team
    const left = half === "bottom" ? yf.fieldSide : 100 - yf.fieldSide;
    return (
      <PlayerDot
        key={i}
        member={m.id != null ? memberById.get(m.id) : undefined}
        color={color}
        top={top}
        left={left}
        delay={i * 0.04}
        teamSide={side}
      />
    );
  });
}

export default function Pitch({
  homeLineup,
  awayLineup,
  memberById,
  homeColor,
  awayColor,
}: {
  homeLineup?: Lineup;
  awayLineup?: Lineup;
  memberById: Map<number, Member>;
  homeColor?: string;
  awayColor?: string;
}) {
  const homeHas = homeLineup?.members?.some((m) => m.status === 1 && m.yardFormation);
  const awayHas = awayLineup?.members?.some((m) => m.status === 1 && m.yardFormation);
  if (!homeHas && !awayHas) return null;

  return (
    <div className="glass animate-fadeUp overflow-hidden rounded-2xl">
      {/* formations header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ background: homeColor || "#00e5a0" }}
          />
          <span className="text-xs font-bold text-dim">{homeLineup?.formation || "—"}</span>
        </div>
        <span className="text-[10px] font-black text-faint">VS</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-dim">{awayLineup?.formation || "—"}</span>
          <div
            className="h-2 w-2 rounded-full"
            style={{ background: awayColor || "#8b5cf6" }}
          />
        </div>
      </div>

      <div className="p-2">
        <div
          className="relative mx-auto w-full overflow-hidden rounded-xl"
          style={{
            aspectRatio: "3/4",
            background:
              "repeating-linear-gradient(0deg, #0b7a42 0 8%, #0a6b3a 8% 16%)",
          }}
        >
          {/* field markings */}
          <div className="pointer-events-none absolute inset-3 rounded-md border-2 border-white/25">
            {/* halfway line */}
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/30" />
            {/* center circle */}
            <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
            {/* center dot */}
            <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
            {/* top penalty area (away team) */}
            <div className="absolute left-1/2 top-0 h-14 w-32 -translate-x-1/2 border-b-2 border-x-2 border-white/25" />
            {/* bottom penalty area (home team) */}
            <div className="absolute bottom-0 left-1/2 h-14 w-32 -translate-x-1/2 border-t-2 border-x-2 border-white/25" />
            {/* top goal area */}
            <div className="absolute left-1/2 top-0 h-6 w-16 -translate-x-1/2 border-b-2 border-x-2 border-white/20" />
            {/* bottom goal area */}
            <div className="absolute bottom-0 left-1/2 h-6 w-16 -translate-x-1/2 border-t-2 border-x-2 border-white/20" />
          </div>

          {placeTeam(homeLineup, memberById, homeColor, "bottom", "home")}
          {placeTeam(awayLineup, memberById, awayColor, "top", "away")}
        </div>
      </div>

      {/* legend */}
      <div className="flex items-center justify-around border-t border-[var(--border)] px-3 py-1.5 text-[10px] text-faint">
        <span>🏠 {homeLineup?.formation || "—"}</span>
        <span>✈️ {awayLineup?.formation || "—"}</span>
      </div>
    </div>
  );
}
