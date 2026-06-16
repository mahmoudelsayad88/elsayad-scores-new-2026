"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TeamLogo from "./TeamLogo";
import {
  competitorLogo,
  competitionLogo,
  type Competitor,
  type Competition,
} from "@/lib/shared";
import { useApp } from "@/lib/app-context";

export default function SearchView() {
  const { t, lang, isFav, toggleFav } = useApp();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Competitor[]>([]);
  const [comps, setComps] = useState<Competition[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setTeams([]);
      setComps([]);
      return;
    }
    const tm = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q.trim())}&lang=${lang}`,
        );
        const data = await res.json();
        setTeams(data.competitors ?? []);
        setComps(data.competitions ?? []);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(tm);
  }, [q, lang]);

  return (
    <div className="px-3 pt-2">
      <div className="glass mb-4 flex items-center gap-2 rounded-2xl px-4 py-3">
        <svg
          className="h-5 w-5 text-faint"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-faint outline-none"
        />
        {q && (
          <button onClick={() => setQ("")} className="text-faint">
            ✕
          </button>
        )}
      </div>

      {loading && <p className="text-center text-sm text-dim">{t("searching")}</p>}

      {!loading && q.trim().length < 2 && (
        <p className="mt-10 text-center text-sm text-faint">{t("typeTwoChars")}</p>
      )}

      {comps.length > 0 && (
        <>
          <h3 className="mb-2 mt-2 text-xs font-bold text-dim">{t("competitions")}</h3>
          <div className="stagger mb-4 flex flex-col gap-2">
            {comps.slice(0, 12).map((c) => (
              <div key={c.id} className="glass flex items-center gap-3 rounded-xl px-3 py-2.5">
                <TeamLogo
                  src={competitionLogo(c.id, c.imageVersion ?? 1, 48)}
                  alt={c.name}
                  size={28}
                />
                <span className="flex-1 truncate text-sm font-semibold text-[var(--text)]">
                  {c.name}
                </span>
                <FavBtn
                  active={isFav("competition", c.id)}
                  onClick={() =>
                    toggleFav({
                      type: "competition",
                      entityId: c.id,
                      name: c.name,
                      imageVersion: c.imageVersion,
                    })
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}

      {teams.length > 0 && (
        <>
          <h3 className="mb-2 text-xs font-bold text-dim">{t("teams")}</h3>
          <div className="stagger flex flex-col gap-2">
            {teams.slice(0, 16).map((tm) => (
              <div key={tm.id} className="glass flex items-center gap-3 rounded-xl px-3 py-2.5">
                <Link href={`/team/${tm.id}`} className="flex flex-1 items-center gap-3 min-w-0">
                  <TeamLogo
                    src={competitorLogo(tm.id, tm.imageVersion ?? 1, 48)}
                    alt={tm.name}
                    size={28}
                    color={tm.color}
                  />
                  <span className="flex-1 truncate text-sm font-semibold text-[var(--text)]">
                    {tm.name}
                  </span>
                </Link>
                <FavBtn
                  active={isFav("team", tm.id)}
                  onClick={() =>
                    toggleFav({
                      type: "team",
                      entityId: tm.id,
                      name: tm.name,
                      imageVersion: tm.imageVersion,
                    })
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FavBtn({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`icon-wiggle flex h-8 w-8 items-center justify-center rounded-full transition-all ${
        active
          ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)] scale-110"
          : "bg-[var(--surface-2)] text-faint"
      }`}
      aria-label="favorite"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
      </svg>
    </button>
  );
}
