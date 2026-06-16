"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TeamLogo from "./TeamLogo";
import { competitorLogo, type StandingsResponse, type StandingRow } from "@/lib/shared";
import { useApp } from "@/lib/app-context";

export default function StandingsTab({
  competitionId,
  highlight,
}: {
  competitionId: number;
  highlight: number[];
}) {
  const { t, lang } = useApp();
  const [data, setData] = useState<StandingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/standings?competitionId=${competitionId}&lang=${lang}`)
      .then((r) => r.json())
      .then((d: StandingsResponse) => setData(d))
      .catch(() => setData({ standings: [] }))
      .finally(() => setLoading(false));
  }, [competitionId, lang]);

  const groups = useMemo(() => {
    const table = data?.standings?.[0];
    if (!table) return [];
    const byGroup = new Map<string, StandingRow[]>();
    for (const row of table.rows) {
      const g = row.groupName ?? "";
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(row);
    }
    return Array.from(byGroup.entries());
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return <p className="pt-10 text-center text-sm text-faint">{t("noStandings")}</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map(([groupName, rows], gi) => (
        <div key={gi} className="glass animate-fadeUp overflow-hidden rounded-2xl">
          {groupName && (
            <div className="brand-gradient px-3 py-1.5 text-xs font-black text-[#04130f]">
              {groupName}
            </div>
          )}
          <div className="flex items-center gap-1 border-b border-[var(--border)] px-3 py-2 text-[11px] font-bold text-faint">
            <span className="w-6 text-center">#</span>
            <span className="flex-1">{t("team")}</span>
            <span className="w-7 text-center">{t("played")}</span>
            <span className="w-7 text-center">{t("won")}</span>
            <span className="w-7 text-center">{t("drawn")}</span>
            <span className="w-7 text-center">{t("lost")}</span>
            <span className="w-9 text-center">+/-</span>
            <span className="w-8 text-center text-[var(--color-brand)]">{t("points")}</span>
          </div>
          {rows.map((row, i) => {
            const hl = highlight.includes(row.competitor.id);
            const pos = row.position ?? i + 1;
            return (
              <Link
                href={`/team/${row.competitor.id}`}
                key={row.competitor.id}
                className={`flex items-center gap-1 border-b border-[var(--border)] px-3 py-2 text-xs last:border-0 ${
                  hl ? "bg-[var(--color-brand)]/10" : ""
                }`}
              >
                <span
                  className={`w-6 text-center font-bold ${
                    pos <= 4
                      ? "text-[var(--color-brand)]"
                      : pos >= rows.length - 2
                        ? "text-[var(--color-live)]"
                        : "text-dim"
                  }`}
                >
                  {pos}
                </span>
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <TeamLogo
                    src={competitorLogo(row.competitor.id, row.competitor.imageVersion ?? 1, 40)}
                    alt={row.competitor.name}
                    size={20}
                    color={row.competitor.color}
                  />
                  <span className={`truncate ${hl ? "font-bold text-[var(--text)]" : "text-dim"}`}>
                    {row.competitor.name}
                  </span>
                </div>
                <span className="w-7 text-center text-dim">{row.gamePlayed}</span>
                <span className="w-7 text-center text-dim">{row.gamesWon}</span>
                <span className="w-7 text-center text-dim">{row.gamesEven}</span>
                <span className="w-7 text-center text-dim">{row.gamesLost}</span>
                <span className="w-9 text-center text-faint">
                  {row.for}:{row.against}
                </span>
                <span className="w-8 text-center font-black text-[var(--text)]">
                  {row.points}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
      <div className="flex flex-wrap gap-3 px-1 text-[10px] text-faint">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[var(--color-brand)]" />
          {t("advancedPositions")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[var(--color-live)]" />
          {t("relegationZone")}
        </span>
      </div>
    </div>
  );
}
