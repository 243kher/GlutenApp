import { pgTable, serial, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { establishmentsTable } from "./establishments";

export const productEstablishmentsTable = pgTable(
  "PRODUCT_ESTABLISHMENTS",
  {
    id: serial("id").primaryKey(),
    productId: integer("productId")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    establishmentId: integer("establishmentId")
      .notNull()
      .references(() => establishmentsTable.id, { onDelete: "cascade" }),
  },
  (t) => ({
    // Empêche d'avoir deux fois la même association (à ajouter en DB si pas déjà fait)
    uniqProductEstablishment: uniqueIndex("uniq_product_establishment").on(
      t.productId,
      t.establishmentId,
    ),
  }),
);

export const insertProductEstablishmentSchema = createInsertSchema(
  productEstablishmentsTable,
).omit({ id: true });
export type InsertProductEstablishment = z.infer<typeof insertProductEstablishmentSchema>;
export type ProductEstablishment = typeof productEstablishmentsTable.$inferSelect;