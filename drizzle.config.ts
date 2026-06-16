import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// Reads DATABASE_URL from the environment so the same config works locally
// and against a cloud database (Neon / Supabase / Vercel Postgres).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
