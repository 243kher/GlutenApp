import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm"; // ← ajouté: and
import {
  db,
  productsTable,
  establishmentsTable,           // ← ajouté
  productEstablishmentsTable,    // ← ajouté
} from "@workspace/db";
import {
  CreateProductBody,
  ListProductsQueryParams,
  LinkProductEstablishmentBody, // ← ajouté (généré par Orval après régénération)
} from "@workspace/api-zod";
import { getUserFromRequest } from "./auth"; // ← ajouté

const router: IRouter = Router();

// ===========================================================
// GET /products  (inchangé)
// ===========================================================
router.get("/products", async (req, res): Promise<void> => {
  const params = ListProductsQueryParams.safeParse(req.query);
  const search = params.success ? params.data.search : null;
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;

  const all = search
    ? await db.select().from(productsTable).where(ilike(productsTable.name, `%${search}%`))
    : await db.select().from(productsTable);

  const total = all.length;
  const paginated = all.slice((page - 1) * limit, page * limit);

  res.json({
    products: paginated.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand ?? null,
      category: p.category ?? null,
      barcode: p.barcode ?? null,
      imageUrl: p.imageUrl ?? null,
      description: p.description ?? null,
      isVerified: p.isVerified,
      createdAt: p.createdAt,
    })),
    total,
    page,
    limit,
  });
});

// ===========================================================
// POST /products  (inchangé)
// ===========================================================
router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.insert(productsTable).values(parsed.data).returning();
  res.status(201).json({
    id: product.id,
    name: product.name,
    brand: product.brand ?? null,
    category: product.category ?? null,
    barcode: product.barcode ?? null,
    imageUrl: product.imageUrl ?? null,
    description: product.description ?? null,
    isVerified: product.isVerified,
    createdAt: product.createdAt,
  });
});

// ===========================================================
// GET /products/:id  (inchangé)
// ===========================================================
router.get("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) {
    res.status(404).json({ error: "Produit non trouvé" });
    return;
  }
  res.json({
    id: product.id,
    name: product.name,
    brand: product.brand ?? null,
    category: product.category ?? null,
    barcode: product.barcode ?? null,
    imageUrl: product.imageUrl ?? null,
    description: product.description ?? null,
    isVerified: product.isVerified,
    createdAt: product.createdAt,
  });
});

// =====================================================================
// ============== AJOUTS : LIENS PRODUITS / ÉTABLISSEMENTS ==============
// =====================================================================

// -------- GET /products/:id/establishments --------
// Liste les établissements qui vendent ce produit
router.get("/products/:id/establishments", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }

  // On vérifie d'abord que le produit existe (utile pour renvoyer un 404 clair)
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) {
    res.status(404).json({ error: "Produit non trouvé" });
    return;
  }

  // JOIN entre la table de jonction et establishments
  const rows = await db
    .select({
      id: establishmentsTable.id,
      name: establishmentsTable.name,
      type: establishmentsTable.type,
      address: establishmentsTable.address,
      city: establishmentsTable.city,
      verificationLevel: establishmentsTable.verificationLevel,
      safeCeliac: establishmentsTable.safeCeliac,
      photoUrl: establishmentsTable.photoUrl,
    })
    .from(productEstablishmentsTable)
    .innerJoin(
      establishmentsTable,
      eq(productEstablishmentsTable.establishmentId, establishmentsTable.id),
    )
    .where(eq(productEstablishmentsTable.productId, id));

  res.json({
    establishments: rows.map((e) => ({
      ...e,
      photoUrl: e.photoUrl ?? null,
    })),
    total: rows.length,
  });
});

// -------- POST /products/:id/establishments --------
// Associe un établissement à un produit (authentifié)
router.post("/products/:id/establishments", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const productId = parseInt(raw, 10);
  if (isNaN(productId)) {
    res.status(400).json({ error: "ID produit invalide" });
    return;
  }

  const parsed = LinkProductEstablishmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { establishmentId } = parsed.data;

  // Vérifie que les deux entités existent
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!product) {
    res.status(404).json({ error: "Produit non trouvé" });
    return;
  }
  const [establishment] = await db
    .select()
    .from(establishmentsTable)
    .where(eq(establishmentsTable.id, establishmentId));
  if (!establishment) {
    res.status(404).json({ error: "Établissement non trouvé" });
    return;
  }

  // Évite les doublons
  const [existing] = await db
    .select()
    .from(productEstablishmentsTable)
    .where(
      and(
        eq(productEstablishmentsTable.productId, productId),
        eq(productEstablishmentsTable.establishmentId, establishmentId),
      ),
    );

  if (existing) {
    res.status(200).json({
      success: false,
      alreadyLinked: true,
      message: "Ce produit est déjà associé à cet établissement",
    });
    return;
  }

  await db
    .insert(productEstablishmentsTable)
    .values({ productId, establishmentId });

  res.status(201).json({
    success: true,
    alreadyLinked: false,
    message: "Association créée",
  });
});

// -------- DELETE /products/:id/establishments/:establishmentId --------
// Retire l'association
router.delete(
  "/products/:id/establishments/:establishmentId",
  async (req, res): Promise<void> => {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    const productId = parseInt(req.params.id, 10);
    const establishmentId = parseInt(req.params.establishmentId, 10);
    if (isNaN(productId) || isNaN(establishmentId)) {
      res.status(400).json({ error: "IDs invalides" });
      return;
    }

    await db
      .delete(productEstablishmentsTable)
      .where(
        and(
          eq(productEstablishmentsTable.productId, productId),
          eq(productEstablishmentsTable.establishmentId, establishmentId),
        ),
      );

    res.json({ success: true });
  },
);

export default router;