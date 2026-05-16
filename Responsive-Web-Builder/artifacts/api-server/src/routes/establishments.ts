import { Router, type IRouter } from "express";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import {
  db,
  establishmentsTable,
  verificationsTable,
  favoritesTable,
  reportsTable,
} from "@workspace/db";
import {
  CreateEstablishmentBody,
  UpdateEstablishmentBody,
  CertifyEstablishmentBody,
  ReportEstablishmentBody,
  ListEstablishmentsQueryParams,
} from "@workspace/api-zod";
import { getUserFromRequest } from "./auth";

const router: IRouter = Router();

function buildEstablishment(
  e: any,
  distance?: number | null,
  isFavorited?: boolean,
) {
  return {
    id: e.id,
    name: e.name,
    type: e.type,
    address: e.address,
    city: e.city,
    lat: e.lat,
    lng: e.lng,
    verificationLevel: e.verificationLevel,
    safeCeliac: e.safeCeliac,
    phone: e.phone ?? null,
    website: e.website ?? null,
    hours: e.hours ?? null,
    description: e.description ?? null,
    photoUrl: e.photoUrl ?? null,
    glutenFreeMenu: e.glutenFreeMenu ?? null,
    averageRating: e.averageRating ?? null,
    reviewCount: e.reviewCount,
    verificationCount: e.verificationCount,
    distance: distance ?? null,
    ownerId: e.ownerId ?? null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    ...(isFavorited !== undefined ? { isFavorited } : {}),
  };
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get("/establishments", async (req, res): Promise<void> => {
  const params = ListEstablishmentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const {
    lat,
    lng,
    radius,
    type,
    verificationLevel,
    safeCeliac,
    search,
    page = 1,
    limit = 20,
  } = params.data;

  const conditions: any[] = [];
  if (type) conditions.push(eq(establishmentsTable.type, type as any));
  if (verificationLevel)
    conditions.push(
      eq(establishmentsTable.verificationLevel, verificationLevel as any),
    );
  if (safeCeliac) conditions.push(eq(establishmentsTable.safeCeliac, true));
  if (search) conditions.push(ilike(establishmentsTable.name, `%${search}%`));

  const allEstablishments = await db
    .select()
    .from(establishmentsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(establishmentsTable.createdAt));

  let filtered = allEstablishments;
  if (lat != null && lng != null && radius != null) {
    filtered = allEstablishments.filter(
      (e) => haversineDistance(lat, lng, e.lat, e.lng) <= radius,
    );
  }

  // Sort by distance when lat/lng provided, otherwise keep default (most recent first)
  if (lat != null && lng != null) {
    filtered = [...filtered].sort(
      (a, b) =>
        haversineDistance(lat, lng, a.lat, a.lng) -
        haversineDistance(lat, lng, b.lat, b.lng),
    );
  }

  const total = filtered.length;
  const pageNum = page ?? 1;
  const limitNum = limit ?? 20;
  const paginated = filtered.slice(
    (pageNum - 1) * limitNum,
    pageNum * limitNum,
  );

  const result = paginated.map((e) => {
    const distance =
      lat != null && lng != null
        ? haversineDistance(lat, lng, e.lat, e.lng)
        : null;
    return buildEstablishment(e, distance);
  });

  res.json({ establishments: result, total, page: pageNum, limit: limitNum });
});

router.post("/establishments", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  const parsed = CreateEstablishmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [establishment] = await db
    .insert(establishmentsTable)
    .values({
      ...parsed.data,
      safeCeliac: parsed.data.safeCeliac ?? false,
      ownerId: user.role === "owner" ? user.id : null,
    })
    .returning();
  res.status(201).json(buildEstablishment(establishment));
});

router.get("/establishments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }
  const user = await getUserFromRequest(req);

  const [establishment] = await db
    .select()
    .from(establishmentsTable)
    .where(eq(establishmentsTable.id, id));

  if (!establishment) {
    res.status(404).json({ error: "Établissement non trouvé" });
    return;
  }

  let isFavorited = false;
  if (user) {
    const [fav] = await db
      .select()
      .from(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, user.id),
          eq(favoritesTable.establishmentId, id),
        ),
      );
    isFavorited = !!fav;
  }

  res.json(buildEstablishment(establishment, null, isFavorited));
});

router.patch("/establishments/:id", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [existing] = await db
    .select()
    .from(establishmentsTable)
    .where(eq(establishmentsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Établissement non trouvé" });
    return;
  }
  if (user.role !== "admin" && existing.ownerId !== user.id) {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  const parsed = UpdateEstablishmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: any = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== null && v !== undefined) updates[k] = v;
  }

  const [updated] = await db
    .update(establishmentsTable)
    .set(updates)
    .where(eq(establishmentsTable.id, id))
    .returning();

  res.json(buildEstablishment(updated));
});

router.post("/establishments/:id/verify", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [existing] = await db
    .select()
    .from(verificationsTable)
    .where(
      and(
        eq(verificationsTable.establishmentId, id),
        eq(verificationsTable.userId, user.id),
      ),
    );

  // Déjà vérifié → on le dit clairement
  if (existing) {
    res.status(200).json({
      success: false,
      alreadyVerified: true,
      message: "Vous avez déjà vérifié cet établissement",
    });
    return;
  }

  // Première vérification → on insère et on met à jour le compteur
  await db
    .insert(verificationsTable)
    .values({ establishmentId: id, userId: user.id });
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(verificationsTable)
    .where(eq(verificationsTable.establishmentId, id));
  const count = Number(countResult[0].count);
  const updates: any = { verificationCount: count };
  if (count >= 3) updates.verificationLevel = "community";
  await db
    .update(establishmentsTable)
    .set(updates)
    .where(eq(establishmentsTable.id, id));

  res.status(201).json({
    success: true,
    alreadyVerified: false,
    verificationCount: count,
    message: "Vérification enregistrée",
  });
});

router.post("/establishments/:id/certify", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = CertifyEstablishmentBody.safeParse(req.body);

  await db
    .update(establishmentsTable)
    .set({ verificationLevel: "certified" })
    .where(eq(establishmentsTable.id, id));

  res.json({ success: true, message: "Établissement certifié" });
});

router.post("/establishments/:id/favorite", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [existing] = await db
    .select()
    .from(favoritesTable)
    .where(
      and(
        eq(favoritesTable.userId, user.id),
        eq(favoritesTable.establishmentId, id),
      ),
    );

  if (existing) {
    await db
      .delete(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, user.id),
          eq(favoritesTable.establishmentId, id),
        ),
      );
    res.json({ isFavorited: false });
  } else {
    await db
      .insert(favoritesTable)
      .values({ userId: user.id, establishmentId: id });
    res.json({ isFavorited: true });
  }
});

router.post("/establishments/:id/report", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = ReportEstablishmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.insert(reportsTable).values({
    establishmentId: id,
    userId: user.id,
    type: parsed.data.type as any,
    description: parsed.data.description,
  });

  res.status(201).json({ success: true, message: "Signalement enregistré" });
});

export default router;
