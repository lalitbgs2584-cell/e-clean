import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from "../controllers/notification.controller";

const notificationRouter = Router();

notificationRouter.get("/", requireAuth, listNotifications);
notificationRouter.get("/unread-count", requireAuth, unreadNotificationCount);
notificationRouter.patch("/read-all", requireAuth, markAllNotificationsRead);
notificationRouter.patch("/:id/read", requireAuth, markNotificationRead);

export { notificationRouter };
