"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TeamLogo from "./TeamLogo";
import { athleteImage, competitorLogo, type ScorerRow } from "@/lib/shared";
import { useApp } from "@/lib/app-context";

export default function ScorersTab({ competitionId }: { competitionId: number }) {
  const { t, lang } = useApp();
  const [rows, setRows] = useState<ScorerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/scorers?competitionId=${competitionId}&lang=${lang}`)
      .then((r) => r.json())
      .then((d) => {
        const stat = d?.stats?.athletesStats?.[0];
        setRows(stat?.rows ?? []);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [competitionId, lang]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="pt-10 text-center text-sm text-faint">{t("noScorers")}</p>;
  }

  return (
    <div className="glass animate-fadeUp overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-[11px] font-bold text-faint">
        <span className="w-6 text-center">#</span>
        <span className="flex-1">{t("scorers")}</span>
        <span className="w-10 text-center text-[var(--color-brand)]">{t("goals")}</span>
      </div>
      {rows.slice(0, 25).map((row, i) => {
        const goals = row.gameStatsValue ?? row.stats?.[0]?.value ?? 0;
        return (
          <Link
            href={`/player/${row.entity.id}`}
            key={row.entity.id}
            className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 last:border-0"
          >
            <span
              className={`w-6 text-center text-sm font-black ${
                i < 3 ? "text-[var(--color-accent)]" : "text-dim"
              }`}
            >
              {i + 1}
            </span>
            <TeamLogo
              src={athleteImage(row.entity.id, row.entity.imageVersion ?? 0, 56)}
              alt={row.entity.name}
              size={32}
            />
            <div className="flex flex-1 flex-col min-w-0">
              <span className="truncate text-sm font-bold text-[var(--text)]">
                {row.entity.name}
              </span>
              {row.entity.positionName && (
                <span className="truncate text-[10px] text-faint">
                  {row.entity.positionName}
                </span>
              )}
            </div>
            {row.entity.competitorId ? (
              <TeamLogo
                src={competitorLogo(row.entity.competitorId, 1, 40)}
                alt=""
                size={18}
              />
            ) : null}
            <span className="w-10 text-center text-base font-black text-[var(--text)]">
              {goals}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
