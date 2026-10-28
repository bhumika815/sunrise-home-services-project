import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../auth';

const router = Router();

// GET notifications for current authenticated user
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE recipient_user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user!.id);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications
    WHERE recipient_user_id = ? AND is_read = 0
  `).get(req.user!.id) as { count: number };

  return res.json({ notifications, unreadCount: unreadCount.count });
});

// PATCH Mark single notification as read
router.patch('/:id/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const notif = db.prepare('SELECT recipient_user_id FROM notifications WHERE id = ?').get(id) as { recipient_user_id: string } | undefined;
  if (!notif) {
    return res.status(404).json({ error: 'Notification not found.' });
  }

  if (notif.recipient_user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  return res.json({ message: 'Notification marked as read.' });
});

// POST Mark all user's notifications as read
router.post('/mark-all-read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ?').run(req.user!.id);
  return res.json({ message: 'All notifications marked as read.' });
});

export default router;
