import { getNews, type Lang } from "@/lib/scores";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lang = (searchParams.get("lang") as Lang) === "en" ? "en" : "ar";
  const entities = searchParams.get("entities") ?? undefined;
  try {
    const data = await getNews(lang, entities);
    return Response.json(data);
  } catch {
    return Response.json({ news: [] }, { status: 200 });
  }
}
