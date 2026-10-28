import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../auth';
import { createAuditLog, VALID_CATEGORIES } from '../helpers';

const router = Router();

// GET all services (Public or Admin)
router.get('/', (req: Request, res: Response) => {
  const { category, search, sort, includeInactive } = req.query;

  let query = 'SELECT * FROM services WHERE 1=1';
  const params: unknown[] = [];

  // If not requesting inactive explicitly or if user not admin, show active only
  if (includeInactive !== 'true') {
    query += ' AND is_active = 1';
  }

  if (category && typeof category === 'string' && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search && typeof search === 'string' && search.trim()) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  if (sort === 'price_asc') {
    query += ' ORDER BY price_inr ASC';
  } else if (sort === 'price_desc') {
    query += ' ORDER BY price_inr DESC';
  } else if (sort === 'duration') {
    query += ' ORDER BY estimated_duration_min ASC';
  } else {
    query += ' ORDER BY category ASC, price_inr ASC';
  }

  const services = db.prepare(query).all(...params);
  return res.json({ services });
});

// GET single service
router.get('/:id', (req: Request, res: Response) => {
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }
  return res.json({ service });
});

// POST create service (Admin only)
router.post('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, category, description, price_inr, estimated_duration_min, image_url } = req.body;

  if (!name || !category || !description || price_inr === undefined || !estimated_duration_min) {
    return res.status(400).json({ error: 'Please provide all required service fields.' });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }

  const parsedPrice = parseInt(price_inr, 10);
  const parsedDuration = parseInt(estimated_duration_min, 10);

  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: 'Service price must be a positive integer in INR.' });
  }

  if (isNaN(parsedDuration) || parsedDuration <= 0) {
    return res.status(400).json({ error: 'Estimated duration must be positive minutes.' });
  }

  const id = `srv_${category.toLowerCase().slice(0, 4)}_${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO services (id, name, category, description, price_inr, estimated_duration_min, image_url, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id,
    String(name).trim(),
    category,
    String(description).trim(),
    parsedPrice,
    parsedDuration,
    image_url ? String(image_url).trim() : null,
    now,
    now
  );

  createAuditLog(req.user!.id, req.user!.full_name, 'admin', 'SERVICE_CREATED', 'service', id, {
    name,
    price_inr: parsedPrice,
  });

  const createdService = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  return res.status(201).json({ message: 'Service added to catalogue successfully.', service: createdService });
});

// PUT update service (Admin only)
router.put('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { name, category, description, price_inr, estimated_duration_min, image_url, is_active } = req.body;

  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  if (category && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }

  const now = new Date().toISOString();
  const updatedName = name ? String(name).trim() : existing.name;
  const updatedCategory = category || existing.category;
  const updatedDesc = description ? String(description).trim() : existing.description;
  const updatedPrice = price_inr !== undefined ? parseInt(price_inr, 10) : existing.price_inr;
  const updatedDuration = estimated_duration_min !== undefined ? parseInt(estimated_duration_min, 10) : existing.estimated_duration_min;
  const updatedImage = image_url !== undefined ? String(image_url).trim() : existing.image_url;
  const updatedActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

  db.prepare(`
    UPDATE services
    SET name = ?, category = ?, description = ?, price_inr = ?, estimated_duration_min = ?, image_url = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updatedName,
    updatedCategory,
    updatedDesc,
    updatedPrice,
    updatedDuration,
    updatedImage,
    updatedActive,
    now,
    id
  );

  createAuditLog(req.user!.id, req.user!.full_name, 'admin', 'SERVICE_UPDATED', 'service', id, {
    oldPrice: existing.price_inr,
    newPrice: updatedPrice,
    oldStatus: existing.is_active,
    newStatus: updatedActive,
  });

  const updatedService = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  return res.json({ message: 'Service updated successfully.', service: updatedService });
});

export default router;
