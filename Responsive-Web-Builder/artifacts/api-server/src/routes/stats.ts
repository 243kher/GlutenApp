import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, establishmentsTable, reviewsTable, usersTable } from "@workspace/db";
import { GetRecentActivityQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const [estStats] = await db
    .select({
      total: sql<number>`count(*)`,
      verified: sql<number>`count(*) filter (where verification_level = 'community')`,
      certified: sql<number>`count(*) filter (where verification_level = 'certified')`,
      safeCeliac: sql<number>`count(*) filter (where safe_celiac = true)`,
    })
    .from(establishmentsTable);

  const [reviewStats] = await db
    .select({ total: sql<number>`count(*)` })
    .from(reviewsTable);

  const [userStats] = await db
    .select({ total: sql<number>`count(*)` })
    .from(usersTable);

  const byTypeRaw = await db
    .select({ type: establishmentsTable.type, count: sql<number>`count(*)` })
    .from(establishmentsTable)
    .groupBy(establishmentsTable.type);

  res.json({
    totalEstablishments: Number(estStats.total),
    verifiedCount: Number(estStats.verified),
    certifiedCount: Number(estStats.certified),
    safeCeliacCount: Number(estStats.safeCeliac),
    totalReviews: Number(reviewStats.total),
    totalUsers: Number(userStats.total),
    byType: byTypeRaw.map((r) => ({ type: r.type, count: Number(r.count) })),
  });
});

router.get("/stats/recent", async (req, res): Promise<void> => {
  const params = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 6) : 6;

  const recent = await db
    .select()
    .from(establishmentsTable)
    .orderBy(desc(establishmentsTable.createdAt))
    .limit(limit);

  res.json(
    recent.map((e) => ({
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
      averageRating: e.averageRating ?? null,
      reviewCount: e.reviewCount,
      verificationCount: e.verificationCount,
      distance: null,
      ownerId: e.ownerId ?? null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }))
  );
});

export default router;
