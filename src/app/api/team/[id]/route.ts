import { getTeam, type Lang } from "@/lib/scores";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const teamId = Number(id);
  const { searchParams } = new URL(req.url);
  const lang = (searchParams.get("lang") as Lang) === "en" ? "en" : "ar";
  if (!Number.isFinite(teamId)) {
    return Response.json({ competitors: [] }, { status: 200 });
  }
  try {
    const data = await getTeam(teamId, lang);
    return Response.json(data);
  } catch {
    return Response.json({ competitors: [] }, { status: 200 });
  }
}
