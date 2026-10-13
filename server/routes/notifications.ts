import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET /api/notifications (Only current user's notifications, zero data leaks - AC01)
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const userNotifications = db.getNotifications()
    .filter(n => n.recipientUserId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({
    notifications: userNotifications,
    unreadCount: userNotifications.filter(n => !n.read).length
  });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUser = req.user!;
  const notification = db.getNotifications().find(n => n.id === id && n.recipientUserId === currentUser.id);

  if (!notification) {
    return res.status(404).json({ error: 'Notificação não encontrada.' });
  }

  notification.read = true;
  db.save();

  return res.json({ notification });
});

// POST /api/notifications/read-all
router.post('/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const userNotifications = db.getNotifications().filter(n => n.recipientUserId === currentUser.id);
  for (const n of userNotifications) {
    n.read = true;
  }
  db.save();

  return res.json({ success: true, count: userNotifications.length });
});

export default router;
