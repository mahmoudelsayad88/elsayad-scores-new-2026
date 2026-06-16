"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TeamLogo from "./TeamLogo";
import StandingsTab from "./StandingsTab";
import ScorersTab from "./ScorersTab";
import NewsView from "./NewsView";
import { useApp } from "@/lib/app-context";
import { competitorLogo } from "@/lib/shared";

interface TeamInfo {
  id: number;
  name: string;
  color?: string;
  imageVersion?: number;
  mainCompetitionId?: number;
  competitions?: { id: number; name: string }[];
}

export default function TeamPage({ teamId }: { teamId: number }) {
  const { t, lang, isFav, toggleFav } = useApp();
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"standings" | "scorers" | "news">("standings");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/team/${teamId}?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => setTeam(d.competitors?.[0] ?? null))
      .catch(() => setTeam(null))
      .finally(() => setLoading(false));
  }, [teamId, lang]);

  const compId = team?.mainCompetitionId ?? team?.competitions?.[0]?.id;
  const fav = team ? isFav("team", team.id) : false;

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-16">
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/90 px-3 py-3 backdrop-blur-xl">
        <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text)]">
          <svg className="h-5 w-5 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span className="flex-1 truncate text-sm font-bold text-[var(--text)]">
          {team?.name ?? t("teamInfo")}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3 p-4">
          <div className="skeleton mx-auto h-24 w-24 rounded-full" />
          <div className="skeleton mx-auto h-5 w-40 rounded" />
        </div>
      ) : !team ? (
        <p className="pt-16 text-center text-sm text-faint">{t("loadFailed")}</p>
      ) : (
        <>
          <div className="relative overflow-hidden">
            <div className="brand-gradient absolute inset-0 opacity-10" />
            <div className="relative flex flex-col items-center gap-3 px-4 py-7">
              <div className="animate-bounceIn">
                <TeamLogo
                  src={competitorLogo(team.id, team.imageVersion ?? 1, 160)}
                  alt={team.name}
                  size={96}
                  color={team.color}
                />
              </div>
              <h1 className="text-xl font-black text-[var(--text)]">{team.name}</h1>
              <button
                onClick={() =>
                  toggleFav({
                    type: "team",
                    entityId: team.id,
                    name: team.name,
                    imageVersion: team.imageVersion,
                  })
                }
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all ${
                  fav
                    ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                    : "brand-gradient text-[#04130f]"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
                </svg>
                {fav ? t("favorites") : t("favorites")}
              </button>
            </div>
          </div>

          <div className="no-scrollbar sticky top-[57px] z-20 flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--bg)]/90 px-3 py-2 backdrop-blur-xl">
            {(["standings", "scorers", "news"] as const).map((tb) => (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                  tab === tb ? "brand-gradient text-[#04130f]" : "text-dim"
                }`}
              >
                {t(tb === "standings" ? "standings" : tb === "scorers" ? "scorers" : "news")}
              </button>
            ))}
          </div>

          <div className="px-3 py-4">
            {tab === "standings" &&
              (compId ? (
                <StandingsTab competitionId={compId} highlight={[team.id]} />
              ) : (
                <p className="pt-10 text-center text-sm text-faint">{t("noStandings")}</p>
              ))}
            {tab === "scorers" &&
              (compId ? (
                <ScorersTab competitionId={compId} />
              ) : (
                <p className="pt-10 text-center text-sm text-faint">{t("noScorers")}</p>
              ))}
            {tab === "news" && <NewsView />}
          </div>
        </>
      )}
    </div>
  );
}
