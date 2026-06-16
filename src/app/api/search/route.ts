import { search, type Lang } from "@/lib/scores";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const lang = (searchParams.get("lang") as Lang) === "en" ? "en" : "ar";
  if (q.length < 2) {
    return Response.json({ competitors: [], competitions: [] });
  }
  const data = await search(q, lang);
  return Response.json(data);
}
