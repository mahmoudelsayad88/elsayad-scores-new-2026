import { db } from "@/db";
import { favorites } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function email(req: Request) {
  const { searchParams } = new URL(req.url);
  return (searchParams.get("email") ?? "").trim().toLowerCase();
}

export async function GET(req: Request) {
  const userEmail = email(req);
  if (!userEmail) return Response.json({ favorites: [] });
  try {
    const rows = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userEmail, userEmail))
      .orderBy(desc(favorites.createdAt));
    return Response.json({ favorites: rows });
  } catch {
    return Response.json({ favorites: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userEmail = String(body?.email ?? "").trim().toLowerCase();
    const { type, entityId, name, imageVersion, meta } = body ?? {};
    if (!userEmail || !type || !entityId || !name) {
      return Response.json({ error: "بيانات ناقصة" }, { status: 400 });
    }
    await db
      .insert(favorites)
      .values({
        userEmail,
        type,
        entityId: Number(entityId),
        name,
        imageVersion: imageVersion ?? 1,
        meta: meta ?? null,
      })
      .onConflictDoNothing();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "خطأ" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = (searchParams.get("email") ?? "").trim().toLowerCase();
    const type = searchParams.get("type");
    const entityId = Number(searchParams.get("entityId"));
    if (!userEmail || !type || !Number.isFinite(entityId)) {
      return Response.json({ error: "بيانات ناقصة" }, { status: 400 });
    }
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userEmail, userEmail),
          eq(favorites.type, type),
          eq(favorites.entityId, entityId),
        ),
      );
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "خطأ" }, { status: 500 });
  }
}
