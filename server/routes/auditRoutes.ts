import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../auth';

const router = Router();

// GET Audit Logs (Admin only)
router.get('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { limit = '50', entityType, action } = req.query;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: unknown[] = [];

  if (entityType && typeof entityType === 'string') {
    query += ' AND entity_type = ?';
    params.push(entityType);
  }

  if (action && typeof action === 'string') {
    query += ' AND action = ?';
    params.push(action);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Math.min(parseInt(String(limit), 10) || 50, 200));

  const logs = db.prepare(query).all(...params) as Array<{
    id: string;
    actor_id: string;
    actor_name: string;
    actor_role: string;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: string | null;
    created_at: string;
  }>;

  const parsed = logs.map((l) => {
    let metadata: unknown = null;
    if (l.metadata) {
      try {
        metadata = JSON.parse(l.metadata);
      } catch {
        metadata = l.metadata;
      }
    }
    return {
      ...l,
      metadata,
    };
  });

  return res.json({ logs: parsed });
});

export default router;
