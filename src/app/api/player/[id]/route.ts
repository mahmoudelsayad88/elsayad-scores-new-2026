import { getAthlete, type Lang } from "@/lib/scores";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const athleteId = Number(id);
  const { searchParams } = new URL(req.url);
  const lang = (searchParams.get("lang") as Lang) === "en" ? "en" : "ar";
  if (!Number.isFinite(athleteId)) {
    return Response.json({ athletes: [] }, { status: 200 });
  }
  try {
    const data = await getAthlete(athleteId, lang);
    return Response.json(data);
  } catch {
    return Response.json({ athletes: [] }, { status: 200 });
  }
}
