import { pgTable, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { establishmentsTable } from "./establishments";

export const favoritesTable = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  establishmentId: integer("establishment_id").notNull().references(() => establishmentsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFavoriteSchema = createInsertSchema(favoritesTable).omit({ id: true, createdAt: true });
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favoritesTable.$inferSelect;
