import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../auth';
import { createAuditLog } from '../helpers';

const router = Router();

// GET Approved reviews (Public)
router.get('/', (_req: Request, res: Response) => {
  const reviews = db.prepare(`
    SELECT r.id, r.booking_id, r.rating, r.comment, r.created_at,
           u.full_name as customer_name,
           s.name as service_name, s.category as service_category
    FROM reviews r
    JOIN users u ON r.customer_id = u.id
    JOIN services s ON r.service_id = s.id
    WHERE r.moderation_status = 'Approved'
    ORDER BY r.created_at DESC
  `).all();

  // Summary statistics
  const stats = db.prepare(`
    SELECT COUNT(*) as total_reviews, AVG(rating) as avg_rating
    FROM reviews
    WHERE moderation_status = 'Approved'
  `).get() as { total_reviews: number; avg_rating: number | null };

  return res.json({
    reviews,
    stats: {
      total: stats.total_reviews,
      average: stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 5.0,
    },
  });
});

// GET All reviews including Pending/Rejected (Admin only)
router.get('/admin', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const reviews = db.prepare(`
    SELECT r.*, u.full_name as customer_name, u.email as customer_email,
           s.name as service_name
    FROM reviews r
    JOIN users u ON r.customer_id = u.id
    JOIN services s ON r.service_id = s.id
    ORDER BY r.created_at DESC
  `).all();

  return res.json({ reviews });
});

// POST Submit review (Authenticated customer for their own completed booking)
router.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { booking_id, rating, comment } = req.body;

  if (!booking_id || rating === undefined || !comment) {
    return res.status(400).json({ error: 'Booking ID, rating (1-5), and review comment are required.' });
  }

  const numericRating = parseInt(rating, 10);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5 stars.' });
  }

  const cleanComment = String(comment).trim();
  if (cleanComment.length < 5) {
    return res.status(400).json({ error: 'Review comment must be at least 5 characters long.' });
  }

  // Verify booking belongs to customer
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id) as Record<string, unknown> | undefined;
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  if (booking.customer_id !== req.user!.id) {
    return res.status(403).json({ error: 'You can only review your own service bookings.' });
  }

  // Verify booking is completed
  if (booking.status !== 'Completed') {
    return res.status(400).json({
      error: `Only completed bookings are eligible for review. Current status: ${booking.status}.`,
    });
  }

  // Prevent duplicate reviews
  const existingReview = db.prepare('SELECT id FROM reviews WHERE booking_id = ?').get(booking_id);
  if (existingReview) {
    return res.status(409).json({ error: 'You have already submitted a review for this booking.' });
  }

  const id = `rev_${Date.now()}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO reviews (id, booking_id, customer_id, service_id, rating, comment, moderation_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'Approved', ?)
    `).run(id, booking_id, req.user!.id, booking.service_id, numericRating, cleanComment, now);

    createAuditLog(req.user!.id, req.user!.full_name, 'customer', 'REVIEW_SUBMITTED', 'review', id, {
      bookingId: booking_id,
      rating: numericRating,
    });

    const created = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
    return res.status(201).json({ message: 'Thank you! Your review has been published.', review: created });
  } catch (err) {
    console.error('Review submission error:', err);
    return res.status(500).json({ error: 'Failed to submit review.' });
  }
});

// PATCH Moderate review (Admin only)
router.patch('/:id/moderate', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { status } = req.body;

  if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Pending, Approved, or Rejected.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE reviews
    SET moderation_status = ?, moderated_by_user_id = ?, moderated_at = ?
    WHERE id = ?
  `).run(status, req.user!.id, now, id);

  createAuditLog(req.user!.id, req.user!.full_name, 'admin', 'REVIEW_MODERATED', 'review', id, {
    newStatus: status,
  });

  return res.json({ message: `Review status updated to ${status}.` });
});

export default router;
