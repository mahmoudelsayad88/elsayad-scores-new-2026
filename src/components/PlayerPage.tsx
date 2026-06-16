"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TeamLogo from "./TeamLogo";
import { useApp } from "@/lib/app-context";
import { athleteImage, competitorLogo, countryFlag } from "@/lib/shared";

interface Athlete {
  id: number;
  name: string;
  age?: number;
  position?: { id: number; name: string };
  formationPosition?: { id: number; name: string };
  nationalityName?: string;
  nationalityId?: number;
  clubId?: number;
  imageVersion?: number;
}
interface Comp {
  id: number;
  name: string;
  imageVersion?: number;
  color?: string;
}

export default function PlayerPage({ playerId }: { playerId: number }) {
  const { t, lang } = useApp();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [club, setClub] = useState<Comp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/player/${playerId}?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => {
        const a: Athlete | null = d.athletes?.[0] ?? null;
        setAthlete(a);
        const c = (d.competitors ?? []).find(
          (x: Comp) => x.id === a?.clubId,
        );
        setClub(c ?? null);
      })
      .catch(() => setAthlete(null))
      .finally(() => setLoading(false));
  }, [playerId, lang]);

  const Info = ({ label, value }: { label: string; value?: string | number }) =>
    value != null && value !== "" ? (
      <div className="glass flex items-center justify-between rounded-xl px-4 py-3">
        <span className="text-sm text-faint">{label}</span>
        <span className="text-sm font-bold text-[var(--text)]">{value}</span>
      </div>
    ) : null;

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-16">
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/90 px-3 py-3 backdrop-blur-xl">
        <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text)]">
          <svg className="h-5 w-5 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span className="flex-1 truncate text-sm font-bold text-[var(--text)]">
          {athlete?.name ?? t("playerInfo")}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3 p-4">
          <div className="skeleton mx-auto h-28 w-28 rounded-full" />
          <div className="skeleton mx-auto h-5 w-40 rounded" />
        </div>
      ) : !athlete ? (
        <p className="pt-16 text-center text-sm text-faint">{t("loadFailed")}</p>
      ) : (
        <>
          <div className="relative overflow-hidden">
            <div className="brand-gradient absolute inset-0 opacity-10" />
            <div className="relative flex flex-col items-center gap-3 px-4 py-7">
              <div className="animate-bounceIn relative">
                <TeamLogo
                  src={athleteImage(athlete.id, athlete.imageVersion ?? 0, 200)}
                  alt={athlete.name}
                  size={112}
                />
                {athlete.nationalityId ? (
                  <span className="absolute -bottom-1 -end-1">
                    <TeamLogo
                      src={countryFlag(athlete.nationalityId, 1, 48)}
                      alt=""
                      size={26}
                    />
                  </span>
                ) : null}
              </div>
              <h1 className="text-xl font-black text-[var(--text)]">{athlete.name}</h1>
              {athlete.position?.name && (
                <span className="rounded-full bg-[var(--color-brand)]/15 px-4 py-1 text-xs font-bold text-[var(--color-brand)]">
                  {athlete.formationPosition?.name || athlete.position.name}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2 px-3 py-4">
            <h3 className="mb-1 text-xs font-bold text-dim">{t("playerInfo")}</h3>
            <div className="stagger space-y-2">
              <Info
                label={t("age")}
                value={athlete.age ? `${athlete.age} ${t("year")}` : undefined}
              />
              <Info label={t("position")} value={athlete.position?.name} />
              <Info label={t("nationality")} value={athlete.nationalityName} />
            </div>

            {club && (
              <>
                <h3 className="mb-1 mt-4 text-xs font-bold text-dim">{t("club")}</h3>
                <Link
                  href={`/team/${club.id}`}
                  className="glass card-hover flex items-center gap-3 rounded-xl px-4 py-3"
                >
                  <TeamLogo
                    src={competitorLogo(club.id, club.imageVersion ?? 1, 56)}
                    alt={club.name}
                    size={36}
                    color={club.color}
                  />
                  <span className="flex-1 font-bold text-[var(--text)]">{club.name}</span>
                  <svg className="h-4 w-4 text-faint rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
