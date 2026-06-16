import { getGame, type Lang } from "@/lib/scores";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const gameId = Number(id);
  const { searchParams } = new URL(req.url);
  const lang = (searchParams.get("lang") as Lang) === "en" ? "en" : "ar";
  if (!Number.isFinite(gameId)) {
    return Response.json({ error: "معرّف غير صالح" }, { status: 400 });
  }
  try {
    const data = await getGame(gameId, lang);
    return Response.json(data);
  } catch {
    return Response.json({ error: "تعذّر تحميل المباراة" }, { status: 200 });
  }
}
