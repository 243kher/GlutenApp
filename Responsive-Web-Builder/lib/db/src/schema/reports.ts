import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { establishmentsTable } from "./establishments";

export const reportTypeEnum = pgEnum("report_type", ["cross_contamination", "wrong_info", "closed", "other"]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "resolved"]);

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  establishmentId: integer("establishment_id").notNull().references(() => establishmentsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: reportTypeEnum("type").notNull(),
  description: text("description").notNull(),
  status: reportStatusEnum("status").notNull().default("pending"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true, updatedAt: true, status: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
