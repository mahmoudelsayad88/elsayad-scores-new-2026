"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import type { MatchStatItem } from "@/lib/shared";

export default function StatsTab({
  gameId,
  homeId,
  awayId,
  homeColor,
  awayColor,
}: {
  gameId: number;
  homeId: number;
  awayId: number;
  homeColor?: string;
  awayColor?: string;
}) {
  const { t, lang } = useApp();
  const [stats, setStats] = useState<MatchStatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/match-stats/${gameId}?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => setStats(d.statistics ?? []))
      .catch(() => setStats([]))
      .finally(() => setLoading(false));
  }, [gameId, lang]);

  // pair home/away stats by name
  const rows = useMemo(() => {
    const byName = new Map<string, { home?: MatchStatItem; away?: MatchStatItem }>();
    for (const s of stats) {
      const e = byName.get(s.name) ?? {};
      if (s.competitorId === homeId) e.home = s;
      else if (s.competitorId === awayId) e.away = s;
      byName.set(s.name, e);
    }
    return Array.from(byName.entries()).filter(([, v]) => v.home || v.away);
  }, [stats, homeId, awayId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="pt-10 text-center text-sm text-faint">{t("noStats")}</p>;
  }

  const hc = homeColor || "#00e5a0";
  const ac = awayColor || "#8b5cf6";

  return (
    <div className="glass animate-fadeUp space-y-4 rounded-2xl p-4">
      {rows.map(([name, v], i) => {
        const hv = v.home?.value ?? "0";
        const av = v.away?.value ?? "0";
        const hp = parseFloat(hv) || 0;
        const ap = parseFloat(av) || 0;
        const total = hp + ap || 1;
        const hPct = Math.round((hp / total) * 100);
        return (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--text)]">
              <span>{hv}</span>
              <span className="text-dim">{name}</span>
              <span>{av}</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="grow-bar h-full rounded-full"
                style={{ width: `${hPct}%`, background: hc }}
              />
              <div
                className="grow-bar h-full flex-1 rounded-full"
                style={{ background: ac }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
