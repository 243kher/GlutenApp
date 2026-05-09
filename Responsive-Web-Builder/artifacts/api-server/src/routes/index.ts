import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import establishmentsRouter from "./establishments";
import reviewsRouter from "./reviews";
import productsRouter from "./products";
import statsRouter from "./stats";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(establishmentsRouter);
router.use(reviewsRouter);
router.use(productsRouter);
router.use(statsRouter);
router.use(adminRouter);

export default router;
