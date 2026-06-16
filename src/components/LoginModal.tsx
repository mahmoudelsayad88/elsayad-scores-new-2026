"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";

export default function LoginModal() {
  const { loginOpen, setLoginOpen, login, t } = useApp();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  if (!loginOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr(t("emailPlaceholder"));
      return;
    }
    setLoading(true);
    const ok = await login(email.trim(), name.trim() || undefined);
    setLoading(false);
    if (!ok) setErr(t("loadFailed"));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => setLoginOpen(false)}
    >
      <div
        className="glass animate-bounceIn w-full max-w-md rounded-t-3xl border-x-0 border-b-0 p-6 sm:rounded-3xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="brand-gradient mb-3 flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl">
            <span className="text-2xl font-black text-[#04130f]">ES</span>
          </div>
          <h2 className="text-xl font-black text-[var(--text)]">
            {t("loginTitle")}
          </h2>
          <p className="mt-1 text-sm text-dim">{t("loginSubtitle")}</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            autoFocus
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--color-brand)]"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--color-brand)]"
          />
          {err && <p className="text-xs text-[var(--color-live)]">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="brand-gradient w-full rounded-xl py-3 text-sm font-black text-[#04130f] disabled:opacity-60"
          >
            {loading ? "..." : t("continue")}
          </button>
        </form>
      </div>
    </div>
  );
}
