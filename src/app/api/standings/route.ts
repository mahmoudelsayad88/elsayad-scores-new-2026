import { getStandings, type Lang } from "@/lib/scores";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const competitionId = Number(searchParams.get("competitionId"));
  const lang = (searchParams.get("lang") as Lang) === "en" ? "en" : "ar";
  if (!Number.isFinite(competitionId)) {
    return Response.json({ standings: [] }, { status: 200 });
  }
  try {
    const data = await getStandings(competitionId, lang);
    return Response.json(data);
  } catch {
    return Response.json({ standings: [] }, { status: 200 });
  }
}
