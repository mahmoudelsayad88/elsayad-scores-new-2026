"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import type { NewsItem } from "@/lib/shared";

export default function NewsView() {
  const { t, lang, locale } = useApp();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/news?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => setNews(d.news ?? []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [lang]);

  if (loading) {
    return (
      <div className="space-y-3 px-3 pt-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass overflow-hidden rounded-2xl">
            <div className="skeleton h-40 w-full" />
            <div className="space-y-2 p-3">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-16 text-center">
        <div className="animate-floaty mb-3 text-6xl">📰</div>
        <p className="text-sm text-dim">{t("noNews")}</p>
      </div>
    );
  }

  const [hero, ...rest] = news;

  return (
    <div className="px-3 pt-3">
      <h2 className="mb-3 text-base font-black text-[var(--text)]">
        {t("latestNews")}
      </h2>

      <div className="stagger space-y-3">
        {/* hero */}
        <a
          href={hero.url}
          target="_blank"
          rel="noopener noreferrer"
          className="glass card-hover block overflow-hidden rounded-2xl"
        >
          {hero.image && (
            <div className="relative h-48 w-full overflow-hidden">
              <img
                src={hero.image}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 p-4">
                <h3 className="text-base font-black leading-snug text-white">
                  {hero.title}
                </h3>
                <p className="mt-1 text-[11px] text-white/70">
                  {new Date(hero.publishDate).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            </div>
          )}
        </a>

        {rest.map((n) => (
          <a
            key={n.id}
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="glass card-hover flex gap-3 overflow-hidden rounded-2xl p-2.5"
          >
            {n.image && (
              <img
                src={n.image}
                alt=""
                className="h-20 w-24 shrink-0 rounded-xl object-cover"
                loading="lazy"
              />
            )}
            <div className="flex flex-1 flex-col justify-center min-w-0">
              <h3 className="line-clamp-3 text-[13px] font-bold leading-snug text-[var(--text)]">
                {n.title}
              </h3>
              <p className="mt-1 text-[10px] text-faint">
                {new Date(n.publishDate).toLocaleDateString(locale, {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
