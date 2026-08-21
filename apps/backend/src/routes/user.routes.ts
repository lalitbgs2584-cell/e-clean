import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const userRouter = Router();

userRouter.get("/leaderboard", requireAuth, UserController.getLeaderboard);
userRouter.get("/me/rank", requireAuth, UserController.getMyRank);
userRouter.get("/me", requireAuth, UserController.getProfile);

// Self-managed profile image (CITIZEN and AUTHORITY only; WORKER is rejected
// here — workers' official avatars are assigned by an authority).
userRouter.post(
  "/me/profile-image/presign",
  requireAuth,
  UserController.presignOwnProfileImage,
);
userRouter.patch(
  "/me/profile-image",
  requireAuth,
  UserController.confirmOwnProfileImage,
);

export { userRouter };
