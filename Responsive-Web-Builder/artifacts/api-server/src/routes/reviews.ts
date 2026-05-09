import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, reviewsTable, establishmentsTable, usersTable } from "@workspace/db";
import { CreateReviewBody, UpdateReviewBody, ListReviewsQueryParams } from "@workspace/api-zod";
import { getUserFromRequest } from "./auth";

const router: IRouter = Router();

async function recalcRating(establishmentId: number) {
  const result = await db
    .select({
      avg: sql<number>`AVG(rating)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.establishmentId, establishmentId));
  await db
    .update(establishmentsTable)
    .set({
      averageRating: result[0].avg ? Number(result[0].avg) : null,
      reviewCount: Number(result[0].count),
    })
    .where(eq(establishmentsTable.id, establishmentId));
}

function buildReview(r: any, user: any) {
  return {
    id: r.id,
    establishmentId: r.establishmentId,
    userId: r.userId,
    userName: user?.name ?? "Utilisateur",
    userAvatarUrl: user?.avatarUrl ?? null,
    rating: r.rating,
    comment: r.comment ?? null,
    crossContaminationAlert: r.crossContaminationAlert,
    photoUrl: r.photoUrl ?? null,
    createdAt: r.createdAt,
  };
}

router.get("/establishments/:id/reviews", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const paramsQ = ListReviewsQueryParams.safeParse(req.query);
  const page = paramsQ.success ? (paramsQ.data.page ?? 1) : 1;
  const limit = paramsQ.success ? (paramsQ.data.limit ?? 10) : 10;

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.establishmentId, id))
    .orderBy(desc(reviewsTable.createdAt));

  const total = reviews.length;
  const paginated = reviews.slice((page - 1) * limit, page * limit);

  const userIds = [...new Set(paginated.map((r) => r.userId))];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(${userIds})`)
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const result = paginated.map((r) => buildReview(r, userMap[r.userId]));
  res.json({ reviews: result, total, page, limit });
});

router.post("/establishments/:id/reviews", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    establishmentId: id,
    userId: user.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
    crossContaminationAlert: parsed.data.crossContaminationAlert ?? false,
    photoUrl: parsed.data.photoUrl ?? null,
  }).returning();

  await recalcRating(id);
  res.status(201).json(buildReview(review, user));
});

router.patch("/reviews/:id", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Avis non trouvé" });
    return;
  }
  if (existing.userId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  const parsed = UpdateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: any = {};
  if (parsed.data.rating != null) updates.rating = parsed.data.rating;
  if (parsed.data.comment !== undefined) updates.comment = parsed.data.comment;
  if (parsed.data.crossContaminationAlert != null) updates.crossContaminationAlert = parsed.data.crossContaminationAlert;
  if (parsed.data.photoUrl !== undefined) updates.photoUrl = parsed.data.photoUrl;

  const [updated] = await db
    .update(reviewsTable)
    .set(updates)
    .where(eq(reviewsTable.id, id))
    .returning();

  await recalcRating(existing.establishmentId);
  res.json(buildReview(updated, user));
});

router.delete("/reviews/:id", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Avis non trouvé" });
    return;
  }
  if (existing.userId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  await recalcRating(existing.establishmentId);
  res.sendStatus(204);
});

export default router;
