import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api';

// Polyfill localStorage for Node test runner
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = String(value); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};
globalThis.localStorage = localStorageMock as unknown as Storage;

describe('Client API Service (api.ts) Functions Unit Tests', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockFetchSuccess(responseData: unknown, status = 200) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => responseData,
    });
  }

  function mockFetchError(errorMessage: string, status = 400) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ error: errorMessage }),
    });
  }

  describe('Authorization Headers and Error Handling', () => {
    it('attaches Authorization header when token exists in localStorage', async () => {
      localStorage.setItem('shs_token', 'test-jwt-token-123');
      mockFetchSuccess({ services: [] });

      await api.getServices();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/services?',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-jwt-token-123',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('throws error with message on failed HTTP responses', async () => {
      mockFetchError('Unauthorized access', 401);

      await expect(api.getServices()).rejects.toThrow('Unauthorized access');
    });
  });

  describe('Services API', () => {
    it('getServices builds proper query parameters', async () => {
      mockFetchSuccess({ services: [] });

      await api.getServices({ category: 'Plumbing', search: 'pipe', sort: 'price_asc', includeInactive: true });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/services?category=Plumbing&search=pipe&sort=price_asc&includeInactive=true',
        expect.any(Object)
      );
    });

    it('getService fetches by id', async () => {
      mockFetchSuccess({ service: { id: 'srv_01', name: 'Tap Repair' } });
      const res = await api.getService('srv_01');
      expect(res.service.name).toBe('Tap Repair');
    });

    it('createService sends POST request', async () => {
      mockFetchSuccess({ message: 'Created', service: { id: 'srv_new' } });
      const res = await api.createService({ name: 'New Service', price_inr: 500 });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/services',
        expect.objectContaining({ method: 'POST' })
      );
      expect(res.service.id).toBe('srv_new');
    });

    it('updateService sends PUT request', async () => {
      mockFetchSuccess({ message: 'Updated', service: { id: 'srv_01' } });
      await api.updateService('srv_01', { price_inr: 600 });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/services/srv_01',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('Bookings API', () => {
    it('createBooking sends POST request with booking payload', async () => {
      mockFetchSuccess({ message: 'Created', booking: { id: 'BK_101' } });
      const payload = {
        service_id: 'srv_01',
        booking_date: '2026-11-15',
        time_slot: '09:00 - 11:00',
        service_address: 'Baner, Pune',
        locality: 'Baner',
        contact_number: '+91 98220 12345',
        problem_description: 'Leak in pipe',
      };
      const res = await api.createBooking(payload);
      expect(res.booking.id).toBe('BK_101');
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/bookings', expect.objectContaining({ method: 'POST' }));
    });

    it('getBookings serializes query parameters', async () => {
      mockFetchSuccess({ bookings: [] });
      await api.getBookings({ status: 'Confirmed', date: '2026-11-15', search: 'Baner' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/bookings?status=Confirmed&date=2026-11-15&search=Baner',
        expect.any(Object)
      );
    });

    it('getBooking fetches specific booking details', async () => {
      mockFetchSuccess({ booking: { id: 'BK_101' }, history: [] });
      const res = await api.getBooking('BK_101');
      expect(res.booking.id).toBe('BK_101');
    });

    it('cancelBooking calls cancel endpoint with reason', async () => {
      mockFetchSuccess({ message: 'Cancelled', booking: { id: 'BK_101', status: 'Cancelled' } });
      await api.cancelBooking('BK_101', 'Changed schedule');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/bookings/BK_101/cancel',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Changed schedule' }),
        })
      );
    });

    it('rescheduleBooking calls reschedule endpoint with new date and slot', async () => {
      mockFetchSuccess({ message: 'Rescheduled', booking: { id: 'BK_101' } });
      await api.rescheduleBooking('BK_101', '2026-11-20', '14:00 - 16:00');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/bookings/BK_101/reschedule',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ new_date: '2026-11-20', new_slot: '14:00 - 16:00' }),
        })
      );
    });

    it('updateBookingStatus calls status PATCH endpoint', async () => {
      mockFetchSuccess({ message: 'Status updated', booking: { id: 'BK_101' } });
      await api.updateBookingStatus('BK_101', 'In Progress', 'Technician arrived');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/bookings/BK_101/status',
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('assignProfessional calls assign PATCH endpoint', async () => {
      mockFetchSuccess({ message: 'Assigned', booking: { id: 'BK_101' } });
      await api.assignProfessional('BK_101', 'prof_001');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/bookings/BK_101/assign',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ professional_id: 'prof_001' }),
        })
      );
    });
  });

  describe('Professionals API', () => {
    it('getProfessionals queries with activeOnly and category', async () => {
      mockFetchSuccess({ professionals: [] });
      await api.getProfessionals({ activeOnly: true, category: 'Plumbing', locality: 'Baner' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/professionals?activeOnly=true&category=Plumbing&locality=Baner',
        expect.any(Object)
      );
    });

    it('createProfessional sends POST request', async () => {
      mockFetchSuccess({ message: 'Created', professional: { id: 'prof_new' } });
      const res = await api.createProfessional({ full_name: 'Santosh Kulkarni' });
      expect(res.professional.id).toBe('prof_new');
    });

    it('updateProfessional sends PUT request', async () => {
      mockFetchSuccess({ message: 'Updated', professional: { id: 'prof_01' } });
      await api.updateProfessional('prof_01', { is_active: 1 });
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/professionals/prof_01', expect.objectContaining({ method: 'PUT' }));
    });

    it('getProfessionalSchedule requests schedule with month parameter', async () => {
      mockFetchSuccess({ schedule: [] });
      await api.getProfessionalSchedule('prof_01', '2026-11');
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/professionals/prof_01/schedule?month=2026-11', expect.any(Object));
    });
  });

  describe('Reviews API', () => {
    it('getApprovedReviews fetches public reviews', async () => {
      mockFetchSuccess({ reviews: [], stats: { total: 0, average: 5 } });
      const res = await api.getApprovedReviews();
      expect(res.stats.average).toBe(5);
    });

    it('getAllReviewsAdmin fetches admin reviews', async () => {
      mockFetchSuccess({ reviews: [] });
      const res = await api.getAllReviewsAdmin();
      expect(Array.isArray(res.reviews)).toBe(true);
    });

    it('submitReview posts review for booking', async () => {
      mockFetchSuccess({ message: 'Review submitted', review: { id: 'rev_1' } });
      const res = await api.submitReview('BK_101', 5, 'Great work');
      expect(res.review.id).toBe('rev_1');
    });

    it('moderateReview patches review moderation status', async () => {
      mockFetchSuccess({ message: 'Review approved' });
      const res = await api.moderateReview('rev_1', 'Approved');
      expect(res.message).toBe('Review approved');
    });
  });

  describe('Enquiries API', () => {
    it('submitEnquiry posts customer enquiry', async () => {
      mockFetchSuccess({ message: 'Submitted', enquiryId: 'enq_1' });
      const res = await api.submitEnquiry({
        name: 'Rohan',
        email: 'rohan@test.com',
        phone: '+91 99999 11111',
        message: 'Need help',
      });
      expect(res.enquiryId).toBe('enq_1');
    });

    it('getEnquiries queries with status and search', async () => {
      mockFetchSuccess({ enquiries: [] });
      await api.getEnquiries({ status: 'New', search: 'Rohan' });
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/enquiries?status=New&search=Rohan', expect.any(Object));
    });

    it('updateEnquiry patches enquiry status and notes', async () => {
      mockFetchSuccess({ message: 'Enquiry updated' });
      const res = await api.updateEnquiry('enq_1', { status: 'Resolved', internal_notes: 'Done' });
      expect(res.message).toBe('Enquiry updated');
    });
  });

  describe('Notifications API', () => {
    it('getNotifications retrieves user notifications', async () => {
      mockFetchSuccess({ notifications: [], unreadCount: 0 });
      const res = await api.getNotifications();
      expect(res.unreadCount).toBe(0);
    });

    it('markNotificationRead sends PATCH', async () => {
      mockFetchSuccess({ message: 'Marked read' });
      const res = await api.markNotificationRead('notif_1');
      expect(res.message).toBe('Marked read');
    });

    it('markAllNotificationsRead sends POST', async () => {
      mockFetchSuccess({ message: 'All marked read' });
      const res = await api.markAllNotificationsRead();
      expect(res.message).toBe('All marked read');
    });
  });

  describe('Reports, Audit Logs and Export API', () => {
    it('getReportSummary fetches dashboard summary metrics with optional date filters', async () => {
      mockFetchSuccess({ metrics: { totalBookings: 10 } });
      const res = await api.getReportSummary({ startDate: '2026-01-01', endDate: '2026-03-31' });
      expect(res.metrics.totalBookings).toBe(10);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/reports/summary?startDate=2026-01-01&endDate=2026-03-31',
        expect.any(Object)
      );
    });

    it('getAuditLogs builds query filters', async () => {
      mockFetchSuccess({ logs: [] });
      await api.getAuditLogs({ limit: 25, entityType: 'booking', action: 'STATUS_CHANGE' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/audit-logs?limit=25&entityType=booking&action=STATUS_CHANGE',
        expect.any(Object)
      );
    });

    it('exportCsvUrl returns accurate export URL without and with date filters', () => {
      expect(api.exportCsvUrl('bookings')).toBe('/api/reports/export-csv?type=bookings');
      expect(api.exportCsvUrl('customers')).toBe('/api/reports/export-csv?type=customers');
      expect(api.exportCsvUrl('services')).toBe('/api/reports/export-csv?type=services');
      expect(api.exportCsvUrl('enquiries')).toBe('/api/reports/export-csv?type=enquiries');

      expect(api.exportCsvUrl('bookings', { startDate: '2026-01-01', endDate: '2026-03-31' }))
        .toBe('/api/reports/export-csv?type=bookings&startDate=2026-01-01&endDate=2026-03-31');
    });
  });
});
