import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, reportsTable, establishmentsTable, usersTable } from "@workspace/db";
import { ResolveReportBody, ModerateEstablishmentBody, ListReportsQueryParams } from "@workspace/api-zod";
import { getUserFromRequest } from "./auth";

const router: IRouter = Router();

router.get("/admin/reports", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  const params = ListReportsQueryParams.safeParse(req.query);
  const status = params.success ? params.data.status : null;

  const reports = status
    ? await db.select().from(reportsTable).where(eq(reportsTable.status, status as any))
    : await db.select().from(reportsTable);

  const result = await Promise.all(
    reports.map(async (r) => {
      const [establishment] = await db.select().from(establishmentsTable).where(eq(establishmentsTable.id, r.establishmentId));
      const [reporter] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId));
      return {
        id: r.id,
        establishmentId: r.establishmentId,
        establishmentName: establishment?.name ?? "Inconnu",
        userId: r.userId,
        userName: reporter?.name ?? "Utilisateur",
        type: r.type,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt,
      };
    })
  );

  res.json(result);
});

router.patch("/admin/reports/:id", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = ResolveReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(reportsTable)
    .set({ status: "resolved", resolution: parsed.data.resolution ?? null })
    .where(eq(reportsTable.id, id));

  res.json({ success: true, message: "Signalement résolu" });
});

router.patch("/admin/establishments/:id/moderate", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = ModerateEstablishmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.action === "verify") {
    await db.update(establishmentsTable).set({ verificationLevel: "community" }).where(eq(establishmentsTable.id, id));
  } else if (parsed.data.action === "certify") {
    await db.update(establishmentsTable).set({ verificationLevel: "certified" }).where(eq(establishmentsTable.id, id));
  } else if (parsed.data.action === "remove") {
    await db.delete(establishmentsTable).where(eq(establishmentsTable.id, id));
  }

  res.json({ success: true, message: "Modération appliquée" });
});

export default router;
