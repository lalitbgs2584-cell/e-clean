import type { Response } from "express";
import { prisma } from "db/client";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";

function getPagination(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export async function listNotifications(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = req.user?.id;
  if (!userId)
    return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          report: { select: { id: true, status: true, location: true } },
        },
      }),
      prisma.notification.count({ where: { userId } }),
    ]);
    return res.json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("listNotifications error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load notifications" });
  }
}

export async function unreadNotificationCount(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = req.user?.id;
  if (!userId)
    return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return res.json({ success: true, data: { count } });
  } catch (error) {
    console.error("unreadNotificationCount error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load unread count" });
  }
}

export async function markNotificationRead(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = req.user?.id;
  const id = req.params.id as string;
  if (!userId)
    return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (!result.count)
      return res
        .status(404)
        .json({ success: false, error: "Notification not found" });
    return res.json({ success: true });
  } catch (error) {
    console.error("markNotificationRead error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to update notification" });
  }
}

export async function markAllNotificationsRead(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = req.user?.id;
  if (!userId)
    return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return res.json({ success: true });
  } catch (error) {
    console.error("markAllNotificationsRead error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to update notifications" });
  }
}
