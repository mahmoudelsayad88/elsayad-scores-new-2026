import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

export const dynamic = "force-dynamic";

// قائمة المسارات اللي هنرجعها
const PATHS = [
  "src/db/schema.ts",
  "src/db/index.ts",
  "src/lib/scores.ts",
  "src/lib/shared.ts",
  "src/lib/i18n.ts",
  "src/lib/app-context.tsx",
  "src/app/api/auth/route.ts",
  "src/app/api/health/route.ts",
  "src/app/api/scores/route.ts",
  "src/app/api/game/[id]/route.ts",
  "src/app/api/standings/route.ts",
  "src/app/api/search/route.ts",
  "src/app/api/favorites/route.ts",
  "src/app/api/match-stats/[id]/route.ts",
  "src/app/api/news/route.ts",
  "src/app/api/scorers/route.ts",
  "src/app/api/team/[id]/route.ts",
  "src/app/api/player/[id]/route.ts",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/globals.css",
  "src/app/match/[id]/page.tsx",
  "src/app/team/[id]/page.tsx",
  "src/app/player/[id]/page.tsx",
  "src/components/Header.tsx",
  "src/components/BottomNav.tsx",
  "src/components/DateBar.tsx",
  "src/components/MatchCard.tsx",
  "src/components/CompetitionGroup.tsx",
  "src/components/MatchesView.tsx",
  "src/components/TeamLogo.tsx",
  "src/components/Skeletons.tsx",
  "src/components/Pitch.tsx",
  "src/components/MatchDetail.tsx",
  "src/components/StandingsTab.tsx",
  "src/components/StatsTab.tsx",
  "src/components/ScorersTab.tsx",
  "src/components/NewsView.tsx",
  "src/components/TeamPage.tsx",
  "src/components/PlayerPage.tsx",
  "src/components/LoginModal.tsx",
  "src/components/FavoritesView.tsx",
  "src/components/SearchView.tsx",
];

export async function GET() {
  const root = process.cwd();
  const files: Record<string, string> = {};

  for (const p of PATHS) {
    try {
      const full = join(root, p);
      files[p] = readFileSync(full, "utf8");
    } catch {
      files[p] = `// FILE NOT FOUND: ${p}`;
    }
  }

  return Response.json({ files, note: "Use this to download all project files" }, {
    headers: { "Content-Type": "application/json" },
  });
}
