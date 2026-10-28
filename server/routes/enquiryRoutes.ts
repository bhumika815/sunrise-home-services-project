import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../auth';
import { createAuditLog } from '../helpers';

const router = Router();

// POST Submit enquiry (Public contact form)
router.post('/', (req: Request, res: Response) => {
  const { name, email, phone, service_requested, message } = req.body;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ error: 'Please provide name, email, phone number, and your message.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const id = `enq_${Date.now()}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO enquiries (id, name, email, phone, service_requested, message, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'New', ?, ?)
    `).run(
      id,
      String(name).trim(),
      cleanEmail,
      String(phone).trim(),
      service_requested ? String(service_requested).trim() : null,
      String(message).trim(),
      now,
      now
    );

    createAuditLog('system', String(name).trim(), 'guest', 'ENQUIRY_RECEIVED', 'enquiry', id, {
      service: service_requested,
    });

    return res.status(201).json({
      message: 'Enquiry received successfully! Our team will contact you within 30–60 minutes.',
      enquiryId: id,
    });
  } catch (err) {
    console.error('Failed to save enquiry:', err);
    return res.status(500).json({ error: 'Failed to record enquiry.' });
  }
});

// GET enquiries (Admin only)
router.get('/', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const { status, search } = req.query;

  let query = 'SELECT * FROM enquiries WHERE 1=1';
  const params: unknown[] = [];

  if (status && typeof status === 'string' && status !== 'All') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search && typeof search === 'string' && search.trim()) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR message LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY created_at DESC';

  const enquiries = db.prepare(query).all(...params);
  return res.json({ enquiries });
});

// PATCH enquiry status & internal notes (Admin only)
router.patch('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { status, internal_notes } = req.body;

  if (status && !['New', 'In Progress', 'Resolved'].includes(status)) {
    return res.status(400).json({ error: 'Status must be New, In Progress, or Resolved.' });
  }

  const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Enquiry not found.' });
  }

  const now = new Date().toISOString();
  const updatedStatus = status || existing.status;
  const updatedNotes = internal_notes !== undefined ? String(internal_notes).trim() : existing.internal_notes;

  db.prepare(`
    UPDATE enquiries
    SET status = ?, internal_notes = ?, updated_at = ?
    WHERE id = ?
  `).run(updatedStatus, updatedNotes, now, id);

  createAuditLog(req.user!.id, req.user!.full_name, 'admin', 'ENQUIRY_UPDATED', 'enquiry', id, {
    newStatus: updatedStatus,
  });

  return res.json({ message: 'Enquiry updated successfully.' });
});

export default router;
