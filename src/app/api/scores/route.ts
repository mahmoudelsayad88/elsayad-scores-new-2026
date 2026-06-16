import { getGamesByDate, getLiveGames, type Lang } from "@/lib/scores";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const live = searchParams.get("live") === "true";
  const lang = (searchParams.get("lang") as Lang) === "en" ? "en" : "ar";

  try {
    const data = live
      ? await getLiveGames(lang)
      : await getGamesByDate(
          date ?? new Date().toISOString().slice(0, 10),
          lang,
        );
    return Response.json(data);
  } catch {
    return Response.json(
      { games: [], competitions: [], error: "تعذّر تحميل البيانات" },
      { status: 200 },
    );
  }
}
