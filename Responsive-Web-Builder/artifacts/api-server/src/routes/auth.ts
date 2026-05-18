import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm"; 
import {
  db,
  usersTable,
  establishmentsTable, 
  reviewsTable,        
  favoritesTable,      
} from "@workspace/db";
import { RegisterBody, LoginBody, UpdateMeBody } from "@workspace/api-zod";
import { createHash } from "crypto";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + process.env.SESSION_SECRET).digest("hex");
}

function makeToken(userId: number): string {
  return Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString("base64");
}

function parseToken(token: string): { userId: number } | null {
  try {
    const data = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    if (typeof data.userId === "number") return { userId: data.userId };
    return null;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(req: any): Promise<typeof usersTable.$inferSelect | null> {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const parsed = parseToken(token);
  if (!parsed) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.userId));
  return user ?? null;
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password, role } = parsed.data;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Un compte avec cet email existe déjà" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash: hashPassword(password),
    role: (role as "user" | "owner") ?? "user",
  }).returning();
  const token = makeToken(user.id);
  res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      dietaryPreferences: user.dietaryPreferences ?? null,
      createdAt: user.createdAt,
    },
    token,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Email ou mot de passe incorrect" });
    return;
  }
  const token = makeToken(user.id);
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      dietaryPreferences: user.dietaryPreferences ?? null,
      createdAt: user.createdAt,
    },
    token,
  });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true, message: "Déconnecté avec succès" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    dietaryPreferences: user.dietaryPreferences ?? null,
    createdAt: user.createdAt,
  });
});

// ============================================================
// GET /auth/me/favorites
// Liste les établissements favoris de l'utilisateur courant
// ============================================================
router.get("/auth/me/favorites", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const results = await db
    .select({
      favoriteId: favoritesTable.id,
      favoritedAt: favoritesTable.createdAt,
      establishment: establishmentsTable,
    })
    .from(favoritesTable)
    .innerJoin(
      establishmentsTable,
      eq(favoritesTable.establishmentId, establishmentsTable.id),
    )
    .where(eq(favoritesTable.userId, user.id))
    .orderBy(desc(favoritesTable.createdAt));

  res.json(
    results.map((r) => ({
      favoriteId: r.favoriteId,
      favoritedAt: r.favoritedAt,
      id: r.establishment.id,
      name: r.establishment.name,
      type: r.establishment.type,
      address: r.establishment.address,
      city: r.establishment.city,
      photoUrl: r.establishment.photoUrl ?? null,
      averageRating: r.establishment.averageRating ?? null,
      reviewCount: r.establishment.reviewCount,
      verificationLevel: r.establishment.verificationLevel,
      safeCeliac: r.establishment.safeCeliac,
    })),
  );
});

// ============================================================
// GET /auth/me/reviews
// Liste les avis publiés par l'utilisateur courant
// ============================================================
router.get("/auth/me/reviews", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const results = await db
    .select({
      review: reviewsTable,
      establishment: establishmentsTable,
    })
    .from(reviewsTable)
    .innerJoin(
      establishmentsTable,
      eq(reviewsTable.establishmentId, establishmentsTable.id),
    )
    .where(eq(reviewsTable.userId, user.id))
    .orderBy(desc(reviewsTable.createdAt));

  res.json(
    results.map((r) => ({
      id: r.review.id,
      rating: r.review.rating,
      comment: r.review.comment ?? null,
      crossContaminationAlert: r.review.crossContaminationAlert,
      photoUrl: r.review.photoUrl ?? null,
      createdAt: r.review.createdAt,
      establishment: {
        id: r.establishment.id,
        name: r.establishment.name,
        type: r.establishment.type,
        city: r.establishment.city,
        photoUrl: r.establishment.photoUrl ?? null,
      },
    })),
  );
});
// ============================================================
// AJOUT : GET /auth/me/stats
// Retourne le nombre d'établissements possédés, d'avis postés
// et de favoris pour l'utilisateur courant
// ============================================================
router.get("/auth/me/stats", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const [establishmentsCount, reviewsCount, favoritesCount] = await Promise.all([
    db
      .select({ count: count() })
      .from(establishmentsTable)
      .where(eq(establishmentsTable.ownerId, user.id)),
    db
      .select({ count: count() })
      .from(reviewsTable)
      .where(eq(reviewsTable.userId, user.id)),
    db
      .select({ count: count() })
      .from(favoritesTable)
      .where(eq(favoritesTable.userId, user.id)),
  ]);

  res.json({
    establishments: Number(establishmentsCount[0]?.count ?? 0),
    reviews: Number(reviewsCount[0]?.count ?? 0),
    favorites: Number(favoritesCount[0]?.count ?? 0),
  });
});

router.patch("/auth/me", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.avatarUrl !== undefined) updates.avatarUrl = parsed.data.avatarUrl ?? undefined;
  if (parsed.data.dietaryPreferences !== undefined) updates.dietaryPreferences = parsed.data.dietaryPreferences ?? undefined;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    avatarUrl: updated.avatarUrl ?? null,
    dietaryPreferences: updated.dietaryPreferences ?? null,
    createdAt: updated.createdAt,
  });
});

export default router;