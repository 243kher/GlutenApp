import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { CreateProductBody, ListProductsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

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

export default router;
