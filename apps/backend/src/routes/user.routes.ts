import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const userRouter = Router();

userRouter.get("/me", requireAuth, UserController.getProfile);

export { userRouter };
