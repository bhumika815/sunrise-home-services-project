import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../auth';
import { createAuditLog } from '../helpers';

const router = Router();

// GET all professionals (Public or Admin)
router.get('/', (req: Request, res: Response) => {
  const { activeOnly, category, locality } = req.query;

  let query = 'SELECT * FROM professionals WHERE 1=1';
  const params: unknown[] = [];

  if (activeOnly !== 'false') {
    query += ' AND is_active = 1';
  }

  const list = db.prepare(query).all(...params) as Array<{
    id: string;
    full_name: string;
    email: string;
    phone: string;
    categories: string;
    service_areas: string;
    is_active: number;
    created_at: string;
  }>;

  // Filter in-memory for JSON array fields if requested
  let results = list.map((p) => ({
    ...p,
    categories: JSON.parse(p.categories || '[]'),
    service_areas: JSON.parse(p.service_areas || '[]'),
  }));

  if (category && typeof category === 'string') {
    results = results.filter((p) => p.categories.includes(category));
  }

  if (locality && typeof locality === 'string') {
    results = results.filter((p) => p.service_areas.includes(locality) || p.service_areas.includes('All Pune'));
  }

  return res.json({ professionals: results });
});

// GET professional calendar/schedule (Admin only)
router.get('/:id/schedule', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { month } = req.query; // YYYY-MM

  let query = `
    SELECT b.id, b.service_name_snapshot, b.booking_date, b.time_slot, b.locality, b.status,
           u.full_name as customer_name, u.phone as customer_phone
    FROM bookings b
    JOIN users u ON b.customer_id = u.id
    WHERE b.assigned_professional_id = ?
      AND b.status IN ('Confirmed', 'In Progress', 'Completed')
  `;
  const params: unknown[] = [id];

  if (month && typeof month === 'string') {
    query += ' AND b.booking_date LIKE ?';
    params.push(`${month}%`);
  }

  query += ' ORDER BY b.booking_date ASC, b.time_slot ASC';

  const schedule = db.prepare(query).all(...params);
  return res.json({ schedule });
});

// POST Create professional (Admin only)
router.post('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { full_name, email, phone, categories, service_areas } = req.body;

  if (!full_name || !email || !phone || !categories || !service_areas) {
    return res.status(400).json({ error: 'Please provide full name, email, phone, skills, and service areas.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM professionals WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'A professional with this email already exists.' });
  }

  const id = `prof_${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO professionals (id, full_name, email, phone, categories, service_areas, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id,
    String(full_name).trim(),
    cleanEmail,
    String(phone).trim(),
    JSON.stringify(Array.isArray(categories) ? categories : [categories]),
    JSON.stringify(Array.isArray(service_areas) ? service_areas : [service_areas]),
    now,
    now
  );

  createAuditLog(req.user!.id, req.user!.full_name, 'admin', 'PROFESSIONAL_CREATED', 'professional', id, {
    name: full_name,
    email: cleanEmail,
  });

  const created = db.prepare('SELECT * FROM professionals WHERE id = ?').get(id) as Record<string, unknown>;
  return res.status(201).json({
    message: 'Professional registered successfully.',
    professional: {
      ...created,
      categories: JSON.parse((created.categories as string) || '[]'),
      service_areas: JSON.parse((created.service_areas as string) || '[]'),
    },
  });
});

// PUT Update professional (Admin only)
router.put('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { full_name, phone, categories, service_areas, is_active } = req.body;

  const existing = db.prepare('SELECT * FROM professionals WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Professional not found.' });
  }

  const now = new Date().toISOString();
  const updatedName = full_name ? String(full_name).trim() : existing.full_name;
  const updatedPhone = phone ? String(phone).trim() : existing.phone;
  const updatedCategories = categories ? JSON.stringify(Array.isArray(categories) ? categories : [categories]) : existing.categories;
  const updatedAreas = service_areas ? JSON.stringify(Array.isArray(service_areas) ? service_areas : [service_areas]) : existing.service_areas;
  const updatedActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

  db.prepare(`
    UPDATE professionals
    SET full_name = ?, phone = ?, categories = ?, service_areas = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(updatedName, updatedPhone, updatedCategories, updatedAreas, updatedActive, now, id);

  createAuditLog(req.user!.id, req.user!.full_name, 'admin', 'PROFESSIONAL_UPDATED', 'professional', id, {
    active: updatedActive,
  });

  const updated = db.prepare('SELECT * FROM professionals WHERE id = ?').get(id) as Record<string, unknown>;
  return res.json({
    message: 'Professional profile updated.',
    professional: {
      ...updated,
      categories: JSON.parse((updated.categories as string) || '[]'),
      service_areas: JSON.parse((updated.service_areas as string) || '[]'),
    },
  });
});

export default router;
