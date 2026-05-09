import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { establishmentsTable } from "./establishments";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  establishmentId: integer("establishment_id").notNull().references(() => establishmentsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  crossContaminationAlert: boolean("cross_contamination_alert").notNull().default(false),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
