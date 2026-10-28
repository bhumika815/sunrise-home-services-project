import { describe, it, expect } from 'vitest';
import {
  generateBookingId,
  validateBookingDate,
  createAuditLog,
  createNotification,
  VALID_TIME_SLOTS,
  VALID_CATEGORIES,
  PUNE_LOCALITIES,
} from './helpers';
import { db, initDatabase } from './db';

describe('Server Helper Functions Unit Tests', () => {
  initDatabase();

  describe('generateBookingId()', () => {
    it('generates a formatted booking ID matching SHS-YYYYMMDD-XXXX', () => {
      const id = generateBookingId();
      expect(id).toMatch(/^SHS-\d{8}-[A-Z0-9]{4}$/);
    });

    it('generates unique booking IDs across multiple invocations', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        ids.add(generateBookingId());
      }
      expect(ids.size).toBe(50);
    });
  });

  describe('validateBookingDate()', () => {
    it('rejects invalid format dates', () => {
      expect(validateBookingDate('invalid-date').valid).toBe(false);
      expect(validateBookingDate('12/05/2026').valid).toBe(false);
      expect(validateBookingDate('2026-5-1').valid).toBe(false);
    });

    it('rejects past dates', () => {
      const result = validateBookingDate('2020-01-01');
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/past date/i);
    });

    it('accepts future dates within the 60-day window', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      const dateStr = future.toISOString().slice(0, 10);
      const result = validateBookingDate(dateStr);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects dates scheduled more than 60 days in advance', () => {
      const distantFuture = new Date();
      distantFuture.setDate(distantFuture.getDate() + 90);
      const dateStr = distantFuture.toISOString().slice(0, 10);
      const result = validateBookingDate(dateStr);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/60 days in advance/i);
    });
  });

  describe('createAuditLog()', () => {
    it('successfully persists an audit log record in the database with metadata', () => {
      const testActorId = 'usr_test_audit_001';
      createAuditLog(
        testActorId,
        'Test Actor',
        'admin',
        'TEST_ACTION',
        'service',
        'srv_123',
        { customKey: 'customVal', price: 999 }
      );

      const log = db.prepare('SELECT * FROM audit_logs WHERE actor_id = ? AND action = ?')
        .get(testActorId, 'TEST_ACTION') as {
          id: string;
          actor_name: string;
          actor_role: string;
          metadata: string;
        } | undefined;

      expect(log).toBeDefined();
      expect(log!.actor_name).toBe('Test Actor');
      expect(log!.actor_role).toBe('admin');
      const parsedMeta = JSON.parse(log!.metadata);
      expect(parsedMeta.customKey).toBe('customVal');
      expect(parsedMeta.price).toBe(999);
    });

    it('handles audit log without metadata', () => {
      const testActorId = 'usr_test_audit_002';
      createAuditLog(testActorId, 'Test Actor 2', 'customer', 'LOGIN', 'user', testActorId);

      const log = db.prepare('SELECT * FROM audit_logs WHERE actor_id = ? AND action = ?')
        .get(testActorId, 'LOGIN') as { id: string; metadata: string | null } | undefined;

      expect(log).toBeDefined();
      expect(log!.metadata).toBeNull();
    });
  });

  describe('createNotification()', () => {
    it('persists a notification record for the specified user', () => {
      const testUserId = 'usr_cust_001';
      createNotification(testUserId, 'Booking Confirmed', 'Your appointment has been booked.');

      const notif = db.prepare('SELECT * FROM notifications WHERE recipient_user_id = ? AND title = ? ORDER BY created_at DESC LIMIT 1')
        .get(testUserId, 'Booking Confirmed') as {
          id: string;
          booking_id: string | null;
          message: string;
          is_read: number;
        } | undefined;

      expect(notif).toBeDefined();
      expect(notif!.message).toBe('Your appointment has been booked.');
      expect(notif!.is_read).toBe(0);
    });
  });

  describe('Constants Verification', () => {
    it('validates business constant lists', () => {
      expect(VALID_TIME_SLOTS).toContain('09:00 - 11:00');
      expect(VALID_CATEGORIES).toContain('Plumbing');
      expect(VALID_CATEGORIES).toContain('Electrical');
      expect(PUNE_LOCALITIES).toContain('Kothrud');
      expect(PUNE_LOCALITIES).toContain('Baner');
    });
  });
});
