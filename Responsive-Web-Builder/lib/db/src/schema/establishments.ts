import { pgTable, text, serial, timestamp, pgEnum, doublePrecision, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const establishmentTypeEnum = pgEnum("establishment_type", ["restaurant", "bakery", "grocery", "cafe", "other"]);
export const verificationLevelEnum = pgEnum("verification_level", ["unverified", "community", "certified"]);

export const establishmentsTable = pgTable("establishments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: establishmentTypeEnum("type").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  verificationLevel: verificationLevelEnum("verification_level").notNull().default("unverified"),
  safeCeliac: boolean("safe_celiac").notNull().default(false),
  phone: text("phone"),
  website: text("website"),
  hours: text("hours"),
  description: text("description"),
  photoUrl: text("photo_url"),
  glutenFreeMenu: text("gluten_free_menu"),
  reviewCount: integer("review_count").notNull().default(0),
  verificationCount: integer("verification_count").notNull().default(0),
  averageRating: doublePrecision("average_rating"),
  ownerId: integer("owner_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEstablishmentSchema = createInsertSchema(establishmentsTable).omit({ id: true, createdAt: true, updatedAt: true, reviewCount: true, verificationCount: true, averageRating: true });
export type InsertEstablishment = z.infer<typeof insertEstablishmentSchema>;
export type Establishment = typeof establishmentsTable.$inferSelect;
