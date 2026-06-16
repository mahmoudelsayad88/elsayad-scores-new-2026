"use client";

import Link from "next/link";
import TeamLogo from "./TeamLogo";
import { competitorLogo, competitionLogo } from "@/lib/shared";
import { useApp } from "@/lib/app-context";

export default function FavoritesView({
  onGoSearch,
}: {
  onGoSearch: () => void;
}) {
  const { t, favorites, toggleFav, user, setLoginOpen } = useApp();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pt-16 text-center">
        <div className="animate-floaty mb-4 text-6xl">🔐</div>
        <h3 className="mb-2 text-lg font-bold text-[var(--text)]">
          {t("loginToFav")}
        </h3>
        <button
          onClick={() => setLoginOpen(true)}
          className="brand-gradient mt-2 rounded-full px-6 py-2.5 text-sm font-bold text-[#04130f]"
        >
          {t("login")}
        </button>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pt-16 text-center">
        <div className="animate-floaty mb-4 text-6xl">⭐</div>
        <h3 className="mb-2 text-lg font-bold text-[var(--text)]">
          {t("noFavorites")}
        </h3>
        <p className="mb-5 text-sm text-dim">{t("addFavoritesHint")}</p>
        <button
          onClick={onGoSearch}
          className="brand-gradient rounded-full px-6 py-2.5 text-sm font-bold text-[#04130f]"
        >
          {t("searchAndAdd")}
        </button>
      </div>
    );
  }

  const teams = favorites.filter((f) => f.type === "team");
  const comps = favorites.filter((f) => f.type === "competition");

  return (
    <div className="px-3 pt-3">
      {comps.length > 0 && (
        <>
          <h3 className="mb-2 text-xs font-bold text-dim">
            {t("favoriteCompetitions")}
          </h3>
          <div className="stagger mb-5 flex flex-col gap-2">
            {comps.map((c) => (
              <div
                key={c.id}
                className="glass animate-popIn flex items-center gap-3 rounded-xl px-3 py-2.5"
              >
                <TeamLogo
                  src={competitionLogo(c.entityId, c.imageVersion ?? 1, 48)}
                  alt={c.name}
                  size={30}
                />
                <span className="flex-1 truncate text-sm font-semibold text-[var(--text)]">
                  {c.name}
                </span>
                <RemoveBtn
                  onClick={() =>
                    toggleFav({ type: "competition", entityId: c.entityId, name: c.name })
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}

      {teams.length > 0 && (
        <>
          <h3 className="mb-2 text-xs font-bold text-dim">
            {t("favoriteTeams")}
          </h3>
          <div className="stagger flex flex-col gap-2">
            {teams.map((tm) => (
              <div
                key={tm.id}
                className="glass animate-popIn flex items-center gap-3 rounded-xl px-3 py-2.5"
              >
                <Link
                  href={`/team/${tm.entityId}`}
                  className="flex flex-1 items-center gap-3 min-w-0"
                >
                  <TeamLogo
                    src={competitorLogo(tm.entityId, tm.imageVersion ?? 1, 48)}
                    alt={tm.name}
                    size={30}
                  />
                  <span className="flex-1 truncate text-sm font-semibold text-[var(--text)]">
                    {tm.name}
                  </span>
                </Link>
                <RemoveBtn
                  onClick={() =>
                    toggleFav({ type: "team", entityId: tm.entityId, name: tm.name })
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

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="icon-wiggle flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
      aria-label="remove"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
      </svg>
    </button>
  );
}
