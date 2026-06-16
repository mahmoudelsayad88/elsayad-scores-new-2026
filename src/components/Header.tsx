"use client";

/* eslint-disable @next/next/no-img-element */
import { useApp } from "@/lib/app-context";

export default function Header({ liveCount }: { liveCount: number }) {
  const { t, theme, toggleTheme, lang, toggleLang, user, logout, setLoginOpen } =
    useApp();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2.5">
        <div className="relative h-10 w-10 shrink-0">
          <div className="brand-gradient absolute inset-0 rounded-xl opacity-40 blur-md" />
          <img
            src="/logo.png"
            alt="Elsayad Scores"
            className="relative h-10 w-10 rounded-xl object-cover"
          />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-black leading-none text-[var(--text)]">
            Elsayad <span className="text-brand-gradient">Scores</span>
          </h1>
          <p className="text-[11px] text-faint">{t("appTagline")}</p>
        </div>

        {liveCount > 0 && (
          <span className="live-dot flex items-center gap-1.5 rounded-full bg-[var(--color-live)]/15 px-2.5 py-1 text-xs font-bold text-[var(--color-live)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-live)]" />
            {liveCount}
          </span>
        )}

        {/* language toggle */}
        <button
          onClick={toggleLang}
          className="icon-wiggle flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-black text-[var(--text)]"
          aria-label="language"
        >
          {lang === "ar" ? "EN" : "ع"}
        </button>

        {/* theme toggle */}
        <button
          onClick={toggleTheme}
          className="icon-wiggle flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text)]"
          aria-label="theme"
        >
          {theme === "dark" ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        {/* account */}
        {user ? (
          <button
            onClick={logout}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[var(--color-brand)]/15 px-2.5 text-[var(--color-brand)]"
            aria-label="logout"
            title={`${t("welcome")} ${user.name || user.email}`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand)] text-xs font-black text-[#04130f]">
              {(user.name || user.email)[0].toUpperCase()}
            </span>
          </button>
        ) : (
          <button
            onClick={() => setLoginOpen(true)}
            className="brand-gradient flex h-9 items-center rounded-full px-3 text-xs font-black text-[#04130f]"
          >
            {t("login")}
          </button>
        )}
      </div>
    </header>
  );
}
