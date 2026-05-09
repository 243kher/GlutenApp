import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { RegisterBody, LoginBody, UpdateMeBody } from "@workspace/api-zod";
import { createHash } from "crypto";

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
