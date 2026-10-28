import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../auth';
import {
  generateBookingId,
  validateBookingDate,
  VALID_TIME_SLOTS,
  createAuditLog,
  createNotification,
} from '../helpers';

const router = Router();

// POST Create new booking (Authenticated Customer)
router.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const {
    service_id,
    booking_date,
    time_slot,
    service_address,
    locality,
    contact_number,
    problem_description,
    additional_instructions,
  } = req.body;

  if (!service_id || !booking_date || !time_slot || !service_address || !locality || !contact_number || !problem_description) {
    return res.status(400).json({ error: 'Please fill all required booking fields.' });
  }

  // 1. Validate service
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(service_id) as {
    id: string;
    name: string;
    price_inr: number;
    is_active: number;
  } | undefined;

  if (!service) {
    return res.status(404).json({ error: 'Selected service does not exist.' });
  }

  if (service.is_active !== 1) {
    return res.status(400).json({ error: 'This service is currently inactive and cannot accept new bookings.' });
  }

  // 2. Validate date
  const dateCheck = validateBookingDate(booking_date);
  if (!dateCheck.valid) {
    return res.status(400).json({ error: dateCheck.error });
  }

  // 3. Validate slot
  if (!VALID_TIME_SLOTS.includes(time_slot)) {
    return res.status(400).json({ error: `Invalid time slot. Allowed slots: ${VALID_TIME_SLOTS.join(', ')}` });
  }

  // 4. Server-authoritative price & unique reference
  const bookingId = generateBookingId();
  const agreedPrice = service.price_inr; // Never trust browser submitted price!
  const now = new Date().toISOString();
  const customerId = req.user!.id;

  // 5. Execute atomic transaction
  const insertTransaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO bookings (
        id, customer_id, service_id, service_name_snapshot, agreed_price_inr,
        service_address, locality, contact_number, booking_date, time_slot,
        problem_description, additional_instructions, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
    `).run(
      bookingId,
      customerId,
      service.id,
      service.name,
      agreedPrice,
      String(service_address).trim(),
      String(locality).trim(),
      String(contact_number).trim(),
      booking_date,
      time_slot,
      String(problem_description).trim(),
      additional_instructions ? String(additional_instructions).trim() : null,
      now,
      now
    );

    // Initial status history entry
    db.prepare(`
      INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by_user_id, change_reason, created_at)
      VALUES (?, ?, NULL, 'Pending', ?, 'Initial booking created by customer', ?)
    `).run(`bsh_${Date.now()}`, bookingId, customerId, now);

    // In-app customer notification
    createNotification(
      customerId,
      'Booking Received',
      `Your service request for "${service.name}" on ${booking_date} (${time_slot}) has been received. Booking Reference: ${bookingId}. Our team will confirm shortly!`,
      bookingId
    );

    // Notify all administrators
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as { id: string }[];
    for (const a of admins) {
      createNotification(
        a.id,
        'New Service Booking',
        `New booking ${bookingId} for "${service.name}" created by ${req.user!.full_name}. Locality: ${locality}.`,
        bookingId
      );
    }

    createAuditLog(customerId, req.user!.full_name, 'customer', 'BOOKING_CREATED', 'booking', bookingId, {
      service: service.name,
      price: agreedPrice,
      date: booking_date,
      slot: time_slot,
    });
  });

  try {
    insertTransaction();
    const createdBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    return res.status(201).json({
      message: 'Booking confirmed and scheduled successfully!',
      booking: createdBooking,
    });
  } catch (err) {
    console.error('Booking insertion failed:', err);
    return res.status(500).json({ error: 'Failed to create booking due to a database error.' });
  }
});

// GET list bookings (Customer: their own; Admin: all with filters)
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { status, date, serviceId, search, professionalId } = req.query;

  let query = `
    SELECT b.*, u.full_name as customer_name, u.email as customer_email,
           p.full_name as professional_name, p.phone as professional_phone
    FROM bookings b
    JOIN users u ON b.customer_id = u.id
    LEFT JOIN professionals p ON b.assigned_professional_id = p.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  // Customer isolation: Non-admins can strictly ONLY view their own bookings
  if (req.user!.role !== 'admin') {
    query += ' AND b.customer_id = ?';
    params.push(req.user!.id);
  } else {
    // Admin filters
    if (professionalId && typeof professionalId === 'string') {
      query += ' AND b.assigned_professional_id = ?';
      params.push(professionalId);
    }
  }

  if (status && typeof status === 'string' && status !== 'All') {
    query += ' AND b.status = ?';
    params.push(status);
  }

  if (date && typeof date === 'string') {
    query += ' AND b.booking_date = ?';
    params.push(date);
  }

  if (serviceId && typeof serviceId === 'string') {
    query += ' AND b.service_id = ?';
    params.push(serviceId);
  }

  if (search && typeof search === 'string' && search.trim()) {
    query += ' AND (b.id LIKE ? OR u.full_name LIKE ? OR b.service_name_snapshot LIKE ? OR b.locality LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY b.created_at DESC';

  const bookings = db.prepare(query).all(...params);
  return res.json({ bookings });
});

// GET single booking details
router.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const booking = db.prepare(`
    SELECT b.*, u.full_name as customer_name, u.email as customer_email,
           p.full_name as professional_name, p.phone as professional_phone, p.categories as professional_categories
    FROM bookings b
    JOIN users u ON b.customer_id = u.id
    LEFT JOIN professionals p ON b.assigned_professional_id = p.id
    WHERE b.id = ?
  `).get(req.params.id) as (Record<string, unknown> & { customer_id: string }) | undefined;

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  // Object-level authorization
  if (req.user!.role !== 'admin' && booking.customer_id !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied. You can only view your own bookings.' });
  }

  const history = db.prepare(`
    SELECT bsh.*, u.full_name as changed_by_name, u.role as changed_by_role
    FROM booking_status_history bsh
    JOIN users u ON bsh.changed_by_user_id = u.id
    WHERE bsh.booking_id = ?
    ORDER BY bsh.created_at ASC
  `).all(String(req.params.id));

  const review = db.prepare('SELECT * FROM reviews WHERE booking_id = ?').get(String(req.params.id));

  return res.json({ booking, history, review });
});

// POST Cancel booking (Customer or Admin)
router.post('/:id/cancel', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { reason } = req.body;

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'A cancellation reason is required.' });
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  // Object-level permission check
  if (req.user!.role !== 'admin' && booking.customer_id !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied. You cannot cancel this booking.' });
  }

  // Cancellation policy check: Only Pending or Confirmed bookings can be cancelled
  if (booking.status === 'Completed') {
    return res.status(400).json({ error: 'Completed bookings cannot be cancelled.' });
  }

  if (booking.status === 'Cancelled') {
    return res.status(400).json({ error: 'This booking is already cancelled.' });
  }

  if (booking.status === 'In Progress') {
    return res.status(400).json({ error: 'Service is currently in progress. Please contact customer support directly to cancel.' });
  }

  const now = new Date().toISOString();
  const prevStatus = booking.status as string;

  const cancelTx = db.transaction(() => {
    db.prepare(`
      UPDATE bookings
      SET status = 'Cancelled', cancellation_reason = ?, cancelled_at = ?, assigned_professional_id = NULL, updated_at = ?
      WHERE id = ?
    `).run(String(reason).trim(), now, now, id);

    db.prepare(`
      INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by_user_id, change_reason, created_at)
      VALUES (?, ?, ?, 'Cancelled', ?, ?, ?)
    `).run(`bsh_${Date.now()}`, id, prevStatus, req.user!.id, String(reason).trim(), now);

    // Notify customer
    createNotification(
      booking.customer_id as string,
      'Booking Cancelled',
      `Your booking (${id}) for "${booking.service_name_snapshot}" has been cancelled. Reason: ${reason}`,
      id
    );

    createAuditLog(req.user!.id, req.user!.full_name, req.user!.role, 'BOOKING_CANCELLED', 'booking', id, {
      previousStatus: prevStatus,
      reason,
    });
  });

  try {
    cancelTx();
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return res.json({ message: 'Booking has been cancelled.', booking: updated });
  } catch (err) {
    console.error('Cancellation error:', err);
    return res.status(500).json({ error: 'Failed to process cancellation.' });
  }
});

// POST Reschedule booking (Customer or Admin)
router.post('/:id/reschedule', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { new_date, new_slot } = req.body;

  if (!new_date || !new_slot) {
    return res.status(400).json({ error: 'New date and time slot are required for rescheduling.' });
  }

  const dateCheck = validateBookingDate(new_date);
  if (!dateCheck.valid) {
    return res.status(400).json({ error: dateCheck.error });
  }

  if (!VALID_TIME_SLOTS.includes(new_slot)) {
    return res.status(400).json({ error: `Invalid slot. Allowed slots: ${VALID_TIME_SLOTS.join(', ')}` });
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  if (req.user!.role !== 'admin' && booking.customer_id !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  if (booking.status === 'Completed' || booking.status === 'Cancelled') {
    return res.status(400).json({ error: `Cannot reschedule a booking that is ${booking.status}.` });
  }

  // Check if assigned professional is available at the new slot
  let assignedProfId: string | null = booking.assigned_professional_id as string | null;
  if (assignedProfId) {
    const conflict = db.prepare(`
      SELECT id FROM bookings
      WHERE assigned_professional_id = ?
        AND booking_date = ?
        AND time_slot = ?
        AND status IN ('Confirmed', 'In Progress')
        AND id != ?
    `).get(assignedProfId, new_date, new_slot, id);

    if (conflict) {
      // Release assignment since technician is occupied at the new time
      assignedProfId = null;
    }
  }

  const now = new Date().toISOString();
  const oldDate = booking.booking_date;
  const oldSlot = booking.time_slot;

  const rescheduleTx = db.transaction(() => {
    db.prepare(`
      UPDATE bookings
      SET booking_date = ?, time_slot = ?, assigned_professional_id = ?, updated_at = ?
      WHERE id = ?
    `).run(new_date, new_slot, assignedProfId, now, id);

    db.prepare(`
      INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by_user_id, change_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `bsh_${Date.now()}`,
      id,
      booking.status,
      booking.status,
      req.user!.id,
      `Rescheduled from ${oldDate} (${oldSlot}) to ${new_date} (${new_slot})`,
      now
    );

    createNotification(
      booking.customer_id as string,
      'Booking Rescheduled',
      `Your booking (${id}) has been rescheduled to ${new_date} (${new_slot}).`,
      id
    );

    createAuditLog(req.user!.id, req.user!.full_name, req.user!.role, 'BOOKING_RESCHEDULED', 'booking', id, {
      from: { date: oldDate, slot: oldSlot },
      to: { date: new_date, slot: new_slot },
      profReassigned: assignedProfId === null && booking.assigned_professional_id !== null,
    });
  });

  try {
    rescheduleTx();
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return res.json({ message: 'Booking rescheduled successfully.', booking: updated });
  } catch (err) {
    console.error('Reschedule error:', err);
    return res.status(500).json({ error: 'Failed to reschedule booking.' });
  }
});

// PATCH Update status (Admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { status, reason } = req.body;

  const ALLOWED_STATUSES = ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  const currentStatus = booking.status as string;

  // Enforce valid lifecycle transitions
  const validTransitions: Record<string, string[]> = {
    Pending: ['Confirmed', 'Cancelled'],
    Confirmed: ['In Progress', 'Cancelled'],
    'In Progress': ['Completed', 'Cancelled'],
    Completed: [], // Terminal state
    Cancelled: [], // Terminal state
  };

  if (!validTransitions[currentStatus]?.includes(status)) {
    return res.status(400).json({
      error: `Invalid status transition from "${currentStatus}" to "${status}".`,
    });
  }

  const now = new Date().toISOString();

  const statusTx = db.transaction(() => {
    db.prepare(`
      UPDATE bookings
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(status, now, id);

    db.prepare(`
      INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by_user_id, change_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `bsh_${Date.now()}`,
      id,
      currentStatus,
      status,
      req.user!.id,
      reason ? String(reason).trim() : `Status transitioned to ${status} by admin`,
      now
    );

    createNotification(
      booking.customer_id as string,
      `Booking Status: ${status}`,
      `Your booking (${id}) for "${booking.service_name_snapshot}" is now marked as "${status}".`,
      id
    );

    createAuditLog(req.user!.id, req.user!.full_name, 'admin', 'BOOKING_STATUS_UPDATE', 'booking', id, {
      from: currentStatus,
      to: status,
      reason,
    });
  });

  try {
    statusTx();
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return res.json({ message: `Booking status updated to ${status}.`, booking: updated });
  } catch (err) {
    console.error('Status transition error:', err);
    return res.status(500).json({ error: 'Failed to update booking status.' });
  }
});

// PATCH Assign Professional (Admin only)
router.patch('/:id/assign', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { professional_id } = req.body;

  const booking = db.prepare(`
    SELECT b.*, s.category as service_category
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    WHERE b.id = ?
  `).get(id) as (Record<string, unknown> & { service_category: string }) | undefined;

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  if (booking.status === 'Completed' || booking.status === 'Cancelled') {
    return res.status(400).json({ error: `Cannot assign a professional to a ${booking.status} booking.` });
  }

  // If unassigning
  if (!professional_id) {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE bookings
      SET assigned_professional_id = NULL, updated_at = ?
      WHERE id = ?
    `).run(now, id);

    createAuditLog(req.user!.id, req.user!.full_name, 'admin', 'PROFESSIONAL_UNASSIGNED', 'booking', id);
    return res.json({ message: 'Professional unassigned from booking.' });
  }

  // Validate professional
  const prof = db.prepare('SELECT * FROM professionals WHERE id = ?').get(professional_id) as {
    id: string;
    full_name: string;
    is_active: number;
    categories: string;
  } | undefined;

  if (!prof) {
    return res.status(404).json({ error: 'Professional not found.' });
  }

  if (prof.is_active !== 1) {
    return res.status(400).json({ error: 'Cannot assign an inactive professional.' });
  }

  // Validate skill match
  const categoriesList = JSON.parse(prof.categories || '[]') as string[];
  if (!categoriesList.includes(booking.service_category)) {
    return res.status(400).json({
      error: `${prof.full_name} does not hold verified skills for "${booking.service_category}". Categories held: ${categoriesList.join(', ')}`,
    });
  }

  // Scheduling conflict check: Cannot have overlapping active booking at same date & slot
  const conflict = db.prepare(`
    SELECT id FROM bookings
    WHERE assigned_professional_id = ?
      AND booking_date = ?
      AND time_slot = ?
      AND status IN ('Confirmed', 'In Progress')
      AND id != ?
  `).get(prof.id, booking.booking_date, booking.time_slot, id);

  if (conflict) {
    return res.status(409).json({
      error: `Conflict detected: ${prof.full_name} already has an active assignment during ${booking.time_slot} on ${booking.booking_date}.`,
    });
  }

  const now = new Date().toISOString();
  // Automatically move Pending to Confirmed on technician assignment
  const nextStatus = booking.status === 'Pending' ? 'Confirmed' : booking.status;

  const assignTx = db.transaction(() => {
    db.prepare(`
      UPDATE bookings
      SET assigned_professional_id = ?, assigned_at = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(prof.id, now, nextStatus, now, id);

    db.prepare(`
      INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by_user_id, change_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `bsh_${Date.now()}`,
      id,
      booking.status,
      nextStatus,
      req.user!.id,
      `Assigned technician ${prof.full_name}`,
      now
    );

    createNotification(
      booking.customer_id as string,
      'Technician Assigned',
      `Technician ${prof.full_name} has been assigned to your booking (${id}) for ${booking.booking_date} (${booking.time_slot}).`,
      id
    );

    createAuditLog(req.user!.id, req.user!.full_name, 'admin', 'PROFESSIONAL_ASSIGNED', 'booking', id, {
      professionalId: prof.id,
      professionalName: prof.full_name,
      slot: booking.time_slot,
      date: booking.booking_date,
    });
  });

  try {
    assignTx();
    const updated = db.prepare(`
      SELECT b.*, p.full_name as professional_name, p.phone as professional_phone
      FROM bookings b
      LEFT JOIN professionals p ON b.assigned_professional_id = p.id
      WHERE b.id = ?
    `).get(id);

    return res.json({ message: `Assigned ${prof.full_name} successfully.`, booking: updated });
  } catch (err) {
    console.error('Assignment error:', err);
    return res.status(500).json({ error: 'Failed to assign professional.' });
  }
});

export default router;
