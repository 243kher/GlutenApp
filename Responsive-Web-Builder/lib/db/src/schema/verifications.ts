import { pgTable, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { establishmentsTable } from "./establishments";

export const verificationsTable = pgTable("verifications", {
  id: serial("id").primaryKey(),
  establishmentId: integer("establishment_id").notNull().references(() => establishmentsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVerificationSchema = createInsertSchema(verificationsTable).omit({ id: true, createdAt: true });
export type InsertVerification = z.infer<typeof insertVerificationSchema>;
export type Verification = typeof verificationsTable.$inferSelect;
