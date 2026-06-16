import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Caches upstream 365scores API responses so the app stays fast and keeps
// working (offline fallback) even if the upstream is briefly unavailable.
export const apiCache = pgTable("api_cache", {
  key: text("key").primaryKey(),
  payload: jsonb("payload").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Lightweight email-based accounts so a user's favourites persist across
// sessions and devices (no password — magic email identity).
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// User favourites (teams / competitions / players) tied to an account so they
// never disappear when the app is reopened.
export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userEmail: text("user_email").notNull(),
    type: text("type").notNull(), // 'team' | 'competition' | 'player'
    entityId: integer("entity_id").notNull(),
    name: text("name").notNull(),
    imageVersion: integer("image_version").default(1),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("favorites_user_type_entity_idx").on(
      t.userEmail,
      t.type,
      t.entityId,
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type ApiCacheRow = typeof apiCache.$inferSelect;
