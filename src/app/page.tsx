"use client";

import { useState } from "react";
import Header from "@/components/Header";
import BottomNav, { type Tab } from "@/components/BottomNav";
import MatchesView from "@/components/MatchesView";
import FavoritesView from "@/components/FavoritesView";
import SearchView from "@/components/SearchView";
import NewsView from "@/components/NewsView";
import LoginModal from "@/components/LoginModal";

export default function Home() {
  const [tab, setTab] = useState<Tab>("matches");
  const [liveCount, setLiveCount] = useState(0);

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-24">
      <Header liveCount={liveCount} />

      <main key={tab} className="animate-fadeUp">
        {tab === "matches" && <MatchesView liveOnly={false} onLiveCount={setLiveCount} />}
        {tab === "live" && <MatchesView liveOnly onLiveCount={setLiveCount} />}
        {tab === "favorites" && <FavoritesView onGoSearch={() => setTab("search")} />}
        {tab === "news" && <NewsView />}
        {tab === "search" && <SearchView />}
      </main>

      <BottomNav active={tab} onChange={setTab} />
      <LoginModal />
    </div>
  );
}
