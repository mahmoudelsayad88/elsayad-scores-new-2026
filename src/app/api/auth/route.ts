import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Safety net: make sure the tables exist even if `drizzle-kit push`
// was never run on the production database. Runs once per cold start.
let ensured = false;
async function ensureTables() {
  if (ensured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        email text NOT NULL UNIQUE,
        name text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS favorites (
        id serial PRIMARY KEY,
        user_email text NOT NULL,
        type text NOT NULL,
        entity_id integer NOT NULL,
        name text NOT NULL,
        image_version integer DEFAULT 1,
        meta jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_type_entity_idx
      ON favorites (user_email, type, entity_id);
    `);
    ensured = true;
  } catch {
    /* ignore — table likely already exists */
  }
}

export async function POST(req: Request) {
  try {
    await ensureTables();
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = body?.name ? String(body.name).trim() : null;
    if (!isEmail(email)) {
      return Response.json({ error: "بريد إلكتروني غير صالح" }, { status: 400 });
    }
    await db.insert(users).values({ email, name }).onConflictDoNothing();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = rows[0] ?? { email, name };
    return Response.json({ user });
  } catch (err) {
    console.error("auth error", err);
    return Response.json(
      { error: "خطأ في الخادم، تأكد من إعداد قاعدة البيانات" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const email = (new URL(req.url).searchParams.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!isEmail(email)) return Response.json({ user: null });
  try {
    await ensureTables();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return Response.json({ user: rows[0] ?? null });
  } catch {
    return Response.json({ user: null });
  }
}
