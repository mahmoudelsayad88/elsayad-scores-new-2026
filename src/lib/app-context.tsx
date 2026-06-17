"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { dict, getLocale, type Lang, type TKey } from "@/lib/i18n";
import type { FavoriteItem } from "@/lib/shared";

type Theme = "dark" | "light";
type User = { email: string; name?: string | null } | null;

type ToggleInput = {
  type: string;
  entityId: number;
  name: string;
  imageVersion?: number;
  meta?: Record<string, unknown>;
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (k: TKey) => string;
  locale: string;
  theme: Theme;
  toggleTheme: () => void;
  user: User;
  login: (email: string, name?: string) => Promise<boolean>;
  logout: () => void;
  favorites: FavoriteItem[];
  isFav: (type: string, entityId: number) => boolean;
  toggleFav: (item: ToggleInput) => void;
  loginOpen: boolean;
  setLoginOpen: (v: boolean) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [theme, setTheme] = useState<Theme>("dark");
  const [user, setUser] = useState<User>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);

  // hydrate from localStorage
  useEffect(() => {
    const sl = localStorage.getItem("es_lang") as Lang | null;
    const st = localStorage.getItem("es_theme") as Theme | null;
    const su = localStorage.getItem("es_user");
    if (sl) setLangState(sl);
    if (st) setTheme(st);
    if (su) {
      try {
        setUser(JSON.parse(su));
      } catch {}
    }
  }, []);

  // apply theme + dir to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", lang);
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    html.setAttribute("data-theme", theme);
    localStorage.setItem("es_lang", lang);
    localStorage.setItem("es_theme", theme);
  }, [lang, theme]);

  // load favorites when user changes
  const loadFavorites = useCallback(async (email: string) => {
    try {
      const res = await fetch(`/api/favorites?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setFavorites(data.favorites ?? []);
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    if (user?.email) loadFavorites(user.email);
    else setFavorites([]);
  }, [user, loadFavorites]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggleLang = useCallback(
    () => setLangState((p) => (p === "ar" ? "en" : "ar")),
    [],
  );
  const toggleTheme = useCallback(
    () => setTheme((p) => (p === "dark" ? "light" : "dark")),
    [],
  );

  const t = useCallback((k: TKey) => dict[lang][k] ?? dict.ar[k] ?? k, [lang]);

  const login = useCallback(async (email: string, name?: string) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.user?.email) {
        // fallback: still log the user in locally so the app is usable
        const fallback = { email: email.toLowerCase(), name: name ?? null };
        setUser(fallback);
        localStorage.setItem("es_user", JSON.stringify(fallback));
        setLoginOpen(false);
        return true;
      }
      const u = { email: data.user.email, name: data.user.name };
      setUser(u);
      localStorage.setItem("es_user", JSON.stringify(u));
      setLoginOpen(false);
      return true;
    } catch {
      // offline / network error: log in locally anyway
      try {
        const fallback = { email: email.toLowerCase(), name: name ?? null };
        setUser(fallback);
        localStorage.setItem("es_user", JSON.stringify(fallback));
        setLoginOpen(false);
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setFavorites([]);
    localStorage.removeItem("es_user");
  }, []);

  const isFav = useCallback(
    (type: string, entityId: number) =>
      favorites.some((f) => f.type === type && f.entityId === entityId),
    [favorites],
  );

  const toggleFav = useCallback(
    async (item: ToggleInput) => {
      if (!user?.email) {
        setLoginOpen(true);
        return;
      }
      const email = user.email;
      const exists = favorites.some(
        (f) => f.type === item.type && f.entityId === item.entityId,
      );
      if (exists) {
        setFavorites((prev) =>
          prev.filter(
            (f) => !(f.type === item.type && f.entityId === item.entityId),
          ),
        );
        await fetch(
          `/api/favorites?email=${encodeURIComponent(email)}&type=${item.type}&entityId=${item.entityId}`,
          { method: "DELETE" },
        ).catch(() => {});
      } else {
        const optimistic: FavoriteItem = {
          id: Date.now(),
          type: item.type,
          entityId: item.entityId,
          name: item.name,
          imageVersion: item.imageVersion,
          meta: item.meta ?? null,
        };
        setFavorites((prev) => [optimistic, ...prev]);
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...item, email }),
        }).catch(() => {});
      }
    },
    [user, favorites],
  );

  return (
    <AppCtx.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t,
        locale: getLocale(lang),
        theme,
        toggleTheme,
        user,
        login,
        logout,
        favorites,
        isFav,
        toggleFav,
        loginOpen,
        setLoginOpen,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
