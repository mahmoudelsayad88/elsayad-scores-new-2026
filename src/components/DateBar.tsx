"use client";

import { useApp } from "@/lib/app-context";

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function DateBar({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (iso: string) => void;
}) {
  const { t, locale } = useApp();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const days: Date[] = [];
  for (let i = -3; i <= 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  const todayISO = toISO(today);
  const tomorrowISO = toISO(new Date(today.getTime() + 86400000));
  const yesterdayISO = toISO(new Date(today.getTime() - 86400000));

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-2.5">
      {days.map((d) => {
        const iso = toISO(d);
        const active = iso === selected;
        let label = d.toLocaleDateString(locale, { weekday: "short" });
        if (iso === todayISO) label = t("today");
        else if (iso === tomorrowISO) label = t("tomorrow");
        else if (iso === yesterdayISO) label = t("yesterday");
        return (
          <button
            key={iso}
            onClick={() => onSelect(iso)}
            className={`relative flex min-w-[62px] flex-col items-center rounded-2xl px-3 py-2 transition-all duration-300 ${
              active
                ? "brand-gradient scale-105 text-[#04130f] shadow-lg shadow-[var(--color-brand)]/30"
                : "glass text-dim hover:text-[var(--text)]"
            }`}
          >
            <span className="text-[11px] font-bold opacity-90">{label}</span>
            <span className="text-xl font-black leading-tight">
              {d.toLocaleDateString(locale, { day: "numeric" })}
            </span>
            <span className="text-[10px] opacity-80">
              {d.toLocaleDateString(locale, { month: "short" })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
