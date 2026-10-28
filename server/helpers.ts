import { db } from './db';

export const VALID_TIME_SLOTS = [
  '09:00 - 11:00',
  '11:00 - 13:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
];

export const VALID_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Air Conditioning',
  'Renovation',
  'Other'
];

export const PUNE_LOCALITIES = [
  'Kothrud',
  'Baner',
  'Wakad',
  'Hinjewadi',
  'Aundh',
  'Viman Nagar',
  'Kalyani Nagar',
  'Koregaon Park',
  'Hadapsar',
  'Magarpatta',
  'Shivajinagar',
  'Karve Nagar',
  'Bavdhan',
  'Pashan',
  'Pimple Saudagar',
  'Sinhagad Road'
];

export function generateBookingId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SHS-${dateStr}-${rand}`;
}

export function createAuditLog(
  actorId: string,
  actorName: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  try {
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      actorId,
      actorName,
      actorRole,
      action,
      entityType,
      entityId,
      metadata ? JSON.stringify(metadata) : null,
      now
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function createNotification(
  recipientUserId: string,
  title: string,
  message: string,
  bookingId?: string | null
) {
  try {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO notifications (id, recipient_user_id, booking_id, title, message, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(id, recipientUserId, bookingId || null, title, message, now);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

export function validateBookingDate(dateStr: string): { valid: boolean; error?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { valid: false, error: 'Invalid date format. Expected YYYY-MM-DD.' };
  }

  const bookingDate = new Date(`${dateStr}T00:00:00`);
  if (isNaN(bookingDate.getTime())) {
    return { valid: false, error: 'Invalid date provided.' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (bookingDate < today) {
    return { valid: false, error: 'Cannot book an appointment for a past date.' };
  }

  // Maximum booking advance: 60 days
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  if (bookingDate > maxDate) {
    return { valid: false, error: 'Bookings cannot be scheduled more than 60 days in advance.' };
  }

  return { valid: true };
}
