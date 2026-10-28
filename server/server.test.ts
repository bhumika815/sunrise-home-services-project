import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { db, initDatabase } from './db';

let customerToken: string;
let adminToken: string;
let testBookingId: string;
let testServiceId: string;

describe('Sunrise Home Services Full-Stack API Test Suite', () => {
  beforeAll(async () => {
    // Ensure isolated test database is fully initialized
    initDatabase();
    // Ensure test professional is active only in the isolated test database
    db.prepare("UPDATE professionals SET is_active = 1 WHERE id = 'prof_001'").run();

    // 1. Login as Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@sunrisehomeservices.com',
        password: 'AdminSecure@2026',
      });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.token;

    // 2. Login as Demo Customer
    const customerRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'customer@demo.com',
        password: 'CustomerDemo@2026',
      });
    expect(customerRes.status).toBe(200);
    customerToken = customerRes.body.token;
  });

  describe('1. Authentication & Security (Section 6 & 10)', () => {
    it('rejects login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@demo.com',
          password: 'WrongPassword123',
        });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid email or password/i);
    });

    it('creates customer account and prevents self-assigning admin role', async () => {
      const testEmail = `newcust_${Date.now()}@test.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Test Customer Pune',
          email: testEmail,
          phone: '+91 98888 77777',
          password: 'Password@123',
          locality: 'Baner',
          role: 'admin', // Malicious attempt to escalate privilege
        });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('customer'); // Must strictly remain customer
      expect(res.body.token).toBeDefined();
    });

    it('rejects registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Duplicate Test',
          email: 'customer@demo.com',
          phone: '+91 99999 88888',
          password: 'Password@123',
        });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('protects admin endpoints from non-admin customers', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Administrator privileges required/i);
    });

    it('loads authenticated customer profile via /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('customer@demo.com');
      expect(res.body.user.role).toBe('customer');
      expect(res.body.user.password_hash).toBeUndefined();
    });

    it('updates customer profile and rejects empty mandatory fields', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          full_name: 'Pooja Joshi',
          phone: '+91 98220 12345',
          address: 'Flat 304, Mayur Elegance, Paud Road',
          locality: 'Kothrud',
        });
      expect(res.status).toBe(200);
      expect(res.body.user.full_name).toBe('Pooja Joshi');

      const invalidRes = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          full_name: '',
          phone: '',
        });
      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error).toMatch(/cannot be empty/i);
    });
  });

  describe('2. Services Catalogue (Section 7)', () => {
    it('retrieves active services with correct pricing and duration', async () => {
      const res = await request(app).get('/api/services');
      expect(res.status).toBe(200);
      expect(res.body.services.length).toBeGreaterThan(0);
      testServiceId = res.body.services[0].id;

      // Check fields
      const s = res.body.services[0];
      expect(s.price_inr).toBeGreaterThan(0);
      expect(s.category).toBeDefined();
      expect(s.estimated_duration_min).toBeGreaterThan(0);
    });

    it('allows search and category filtering', async () => {
      const res = await request(app).get('/api/services?category=Plumbing');
      expect(res.status).toBe(200);
      res.body.services.forEach((s: { category: string }) => {
        expect(s.category).toBe('Plumbing');
      });
    });
  });

  describe('3. Booking Engine & Pricing (Section 8 & 9)', () => {
    it('creates booking with server-authoritative price and unique reference', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const dateStr = futureDate.toISOString().slice(0, 10);

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          service_id: testServiceId,
          booking_date: dateStr,
          time_slot: '11:00 - 13:00',
          service_address: 'Flat 502, Green Acre, Wakad',
          locality: 'Wakad',
          contact_number: '+91 98220 12345',
          problem_description: 'Kitchen drain is severely blocked.',
          submitted_price: 1, // Malicious client attempt to forge price to 1 rupee
        });

      expect(res.status).toBe(201);
      expect(res.body.booking.id).toMatch(/^SHS-\d{8}-[A-Z0-9]{4}$/);
      expect(res.body.booking.agreed_price_inr).toBeGreaterThan(100); // Server calculated
      expect(res.body.booking.status).toBe('Pending');
      testBookingId = res.body.booking.id;
    });

    it('rejects booking with past date', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          service_id: testServiceId,
          booking_date: '2020-01-01',
          time_slot: '09:00 - 11:00',
          service_address: 'Baner, Pune',
          locality: 'Baner',
          contact_number: '+91 98220 12345',
          problem_description: 'Test past date',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/past date/i);
    });

    it('rejects booking with invalid time slot', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          service_id: testServiceId,
          booking_date: futureDate.toISOString().slice(0, 10),
          time_slot: 'Midnight - 2 AM', // Invalid
          service_address: 'Kothrud, Pune',
          locality: 'Kothrud',
          contact_number: '+91 98220 12345',
          problem_description: 'Test slot',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid time slot/i);
    });
  });

  describe('4. Rescheduling & Cancellation Rules (Section 9)', () => {
    it('allows customer to reschedule their pending booking', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 7);
      const dateStr = newDate.toISOString().slice(0, 10);

      const res = await request(app)
        .post(`/api/bookings/${testBookingId}/reschedule`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          new_date: dateStr,
          new_slot: '14:00 - 16:00',
        });
      expect(res.status).toBe(200);
      expect(res.body.booking.booking_date).toBe(dateStr);
      expect(res.body.booking.time_slot).toBe('14:00 - 16:00');
    });

    it('allows customer to cancel booking with valid reason', async () => {
      const res = await request(app)
        .post(`/api/bookings/${testBookingId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Need to travel out of Pune for urgent office work.',
        });
      expect(res.status).toBe(200);
      expect(res.body.booking.status).toBe('Cancelled');
      expect(res.body.booking.cancellation_reason).toMatch(/travel out of Pune/i);
    });

    it('rejects cancellation of an already cancelled booking', async () => {
      const res = await request(app)
        .post(`/api/bookings/${testBookingId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Duplicate cancel',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already cancelled/i);
    });

    it('enforces object-level authorization: customer B cannot view or cancel customer A booking', async () => {
      // Register customer B
      const customerBRes = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Customer B Isolation',
          email: `custb_${Date.now()}@test.com`,
          phone: '+91 91111 22222',
          password: 'Password@123',
          locality: 'Kothrud',
        });
      const customerBToken = customerBRes.body.token;

      // Customer B attempts to view Customer A's booking
      const viewRes = await request(app)
        .get(`/api/bookings/${testBookingId}`)
        .set('Authorization', `Bearer ${customerBToken}`);
      expect(viewRes.status).toBe(403);
      expect(viewRes.body.error).toMatch(/Access denied/i);

      // Customer B attempts to cancel Customer A's booking
      const cancelRes = await request(app)
        .post(`/api/bookings/${testBookingId}/cancel`)
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({ reason: 'Malicious cancel attempt' });
      expect(cancelRes.status).toBe(403);
      expect(cancelRes.body.error).toMatch(/Access denied/i);
    });
  });

  describe('5. Professional Assignment & Scheduling Conflicts (Section 11 & 12)', () => {
    let activeBookingId: string;

    beforeAll(() => {
      // Clean up previous assignment test bookings from isolated test database to prevent date collisions
      db.prepare("DELETE FROM bookings WHERE problem_description IN ('Tap replacement needed.', 'Second booking collision test')").run();
    });

    it('creates fresh booking for assignment testing', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15 + Math.floor(Math.random() * 35));
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          service_id: 'srv_plumb_01',
          booking_date: futureDate.toISOString().slice(0, 10),
          time_slot: '09:00 - 11:00',
          service_address: 'Kothrud, Pune',
          locality: 'Kothrud',
          contact_number: '+91 98220 12345',
          problem_description: 'Tap replacement needed.',
        });
      expect(res.status).toBe(201);
      activeBookingId = res.body.booking.id;
    });

    it('assigns skilled professional Santosh (prof_001) to plumbing booking', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${activeBookingId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ professional_id: 'prof_001' });
      expect(res.status).toBe(200);
      expect(res.body.booking.assigned_professional_id).toBe('prof_001');
      expect(res.body.booking.status).toBe('Confirmed');
    });

    it('detects and prevents overlapping active assignment to same professional on same slot', async () => {
      // Create a second booking at the exact same date & slot
      const existing = (await request(app).get(`/api/bookings/${activeBookingId}`).set('Authorization', `Bearer ${adminToken}`)).body.booking;

      const secondBookingRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          service_id: 'srv_plumb_01',
          booking_date: existing.booking_date,
          time_slot: existing.time_slot,
          service_address: 'Deccan, Pune',
          locality: 'Deccan',
          contact_number: '+91 98220 12345',
          problem_description: 'Second booking collision test',
        });
      const secondId = secondBookingRes.body.booking.id;

      // Try to assign Santosh again at the exact same slot
      const conflictRes = await request(app)
        .patch(`/api/bookings/${secondId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ professional_id: 'prof_001' });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error).toMatch(/Conflict detected.*already has an active assignment/i);
    });
  });

  describe('6. Reviews & Enquiries (Section 14 & 15)', () => {
    it('rejects customer review for non-completed booking', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          booking_id: testBookingId, // Cancelled booking
          rating: 5,
          comment: 'Good service attempt',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Only completed bookings are eligible/i);
    });

    it('saves contact enquiry to database', async () => {
      const res = await request(app)
        .post('/api/enquiries')
        .send({
          name: 'Ananya Deshmukh',
          email: 'ananya@gmail.com',
          phone: '+91 98555 44444',
          service_requested: 'Electrical',
          message: 'Need ceiling fan installation in Kothrud.',
        });
      expect(res.status).toBe(201);
      expect(res.body.enquiryId).toBeDefined();

      // Admin updates enquiry status
      const updateRes = await request(app)
        .patch(`/api/enquiries/${res.body.enquiryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'In Progress',
          internal_notes: 'Technician dispatched for site inspection.',
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.message).toMatch(/updated successfully/i);
    });

    it('retrieves user notifications and marks a notification as read', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.notifications)).toBe(true);

      if (res.body.notifications.length > 0) {
        const notifId = res.body.notifications[0].id;
        const markRes = await request(app)
          .patch(`/api/notifications/${notifId}/read`)
          .set('Authorization', `Bearer ${customerToken}`);
        expect(markRes.status).toBe(200);
      }
    });
  });

  describe('7. Reports & Audit Logging (Section 16 & 17)', () => {
    it('calculates real database summary metrics for administrator', async () => {
      const res = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.metrics.totalBookings).toBeGreaterThan(0);
      expect(res.body.metrics.statusCounts).toBeDefined();
      expect(res.body.metrics.completedValueInr).toBeGreaterThanOrEqual(0);
      expect(res.body.metrics.activeBookingValueInr).toBeGreaterThanOrEqual(0);
      expect(res.body.metrics.averageTicketSizeInr).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.body.categoryStats)).toBe(true);
      expect(Array.isArray(res.body.technicianStats)).toBe(true);
      if (res.body.technicianStats.length > 0) {
        expect(res.body.technicianStats[0].assigned_jobs).toBeDefined();
        expect(res.body.technicianStats[0].completed_jobs).toBeDefined();
        expect(res.body.technicianStats[0].active_jobs).toBeDefined();
      }
    });

    it('supports date-range filtering for summary metrics', async () => {
      const res = await request(app)
        .get('/api/reports/summary?startDate=2026-01-01&endDate=2026-12-31')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.appliedFilter).toEqual({ startDate: '2026-01-01', endDate: '2026-12-31' });
    });

    it('exports bookings as CSV for authorized admin', async () => {
      const res = await request(app)
        .get('/api/reports/export-csv?type=bookings')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="sunrise-bookings-.*\.csv"/);
      expect(res.text).toContain('Booking ID,Customer Name,Email,Phone,Service,Price (INR),Date,Time Slot,Locality,Service Address,Status,Assigned Technician,Created At');
    });

    it('exports services as CSV for authorized admin', async () => {
      const res = await request(app)
        .get('/api/reports/export-csv?type=services')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="sunrise-services-.*\.csv"/);
      expect(res.text).toContain('Service ID,Name,Category,Description,Price (INR),Duration (mins),Status,Created At');
    });

    it('exports customers as CSV without exposing password hashes or tokens', async () => {
      const res = await request(app)
        .get('/api/reports/export-csv?type=customers')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="sunrise-customers-.*\.csv"/);
      expect(res.text).toContain('Customer ID,Full Name,Email,Phone,Locality,Address,Joined At');
      expect(res.text).not.toContain('password');
      expect(res.text).not.toContain('token');
      expect(res.text).not.toContain('secret');
    });

    it('exports enquiries as CSV for authorized admin', async () => {
      const res = await request(app)
        .get('/api/reports/export-csv?type=enquiries')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="sunrise-enquiries-.*\.csv"/);
      expect(res.text).toContain('Enquiry ID,Name,Email,Phone,Service Requested,Message,Status,Internal Notes,Created At');
    });

    it('rejects CSV export for non-admin customers with 403', async () => {
      const res = await request(app)
        .get('/api/reports/export-csv?type=bookings')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects CSV export for unauthenticated requests with 401', async () => {
      const res = await request(app)
        .get('/api/reports/export-csv?type=bookings');
      expect(res.status).toBe(401);
    });

    it('rejects invalid export type with 400', async () => {
      const res = await request(app)
        .get('/api/reports/export-csv?type=invalid_type')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid export type/i);
    });

    it('retrieves immutable audit logs', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBeGreaterThan(0);
      expect(res.body.logs[0].action).toBeDefined();
    });
  });
});
