import { getGame } from "@/lib/scores";
import MatchDetail from "@/components/MatchDetail";
import Link from "next/link";
import type { GameDetailResponse } from "@/lib/shared";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gameId = Number(id);

  let data: GameDetailResponse | null = null;
  try {
    data = (await getGame(gameId)) as GameDetailResponse;
  } catch {
    data = null;
  }

  if (!data || !data.game) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-lg font-bold text-white">تعذّر تحميل المباراة</h1>
        <Link
          href="/"
          className="brand-gradient rounded-full px-6 py-2.5 text-sm font-bold text-[#04130f]"
        >
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return <MatchDetail data={data} />;
}
