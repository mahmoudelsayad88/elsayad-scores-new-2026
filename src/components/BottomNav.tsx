"use client";

import { useApp } from "@/lib/app-context";
import type { TKey } from "@/lib/i18n";

export type Tab = "matches" | "live" | "favorites" | "news" | "search";

const ITEMS: { id: Tab; label: TKey; icon: React.ReactNode }[] = [
  {
    id: "matches",
    label: "matches",
    icon: (
      <path
        d="M3 5h18v14H3z M3 10h18 M8 5v14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "live",
    label: "live",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path
          d="M5.6 5.6a9 9 0 0 0 0 12.8 M18.4 18.4a9 9 0 0 0 0-12.8 M8.5 8.5a5 5 0 0 0 0 7 M15.5 15.5a5 5 0 0 0 0-7"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    id: "favorites",
    label: "favorites",
    icon: (
      <path
        d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "news",
    label: "news",
    icon: (
      <>
        <path
          d="M4 5h13v14H4z M17 9h3v8a2 2 0 0 1-2 2"
          strokeLinejoin="round"
        />
        <path d="M7 9h7M7 13h7M7 17h4" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: "search",
    label: "search",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
      </>
    ),
  },
];

export default function BottomNav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const { t } = useApp();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1 py-1.5">
        {ITEMS.map((it) => {
          const on = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className={`icon-wiggle relative flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
                on ? "text-[var(--color-brand)]" : "text-faint"
              }`}
            >
              {on && (
                <span className="brand-gradient absolute -top-0.5 h-1 w-8 rounded-full" />
              )}
              <svg
                className={`h-6 w-6 transition-transform ${on ? "scale-110" : ""}`}
                viewBox="0 0 24 24"
                fill={on && it.id === "favorites" ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                {it.icon}
              </svg>
              <span className="text-[10px] font-bold">{t(it.label)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
