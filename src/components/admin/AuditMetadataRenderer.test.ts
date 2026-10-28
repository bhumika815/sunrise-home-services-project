import { describe, it, expect } from 'vitest';
import {
  parseAuditMetadata,
  formatLabel,
  formatDateSafe,
  formatSingleValue,
} from './AuditMetadataRenderer';

describe('AuditMetadataRenderer Logic & Formatting', () => {
  describe('parseAuditMetadata', () => {
    it('handles null and undefined correctly as empty', () => {
      expect(parseAuditMetadata(null)).toEqual({ status: 'empty', data: null });
      expect(parseAuditMetadata(undefined)).toEqual({ status: 'empty', data: null });
    });

    it('handles empty strings and JSON null / empty structures', () => {
      expect(parseAuditMetadata('')).toEqual({ status: 'empty', data: null });
      expect(parseAuditMetadata('   ')).toEqual({ status: 'empty', data: null });
      expect(parseAuditMetadata('null')).toEqual({ status: 'empty', data: null });
      expect(parseAuditMetadata('{}')).toEqual({ status: 'empty', data: null });
      expect(parseAuditMetadata('[]')).toEqual({ status: 'empty', data: null });
      expect(parseAuditMetadata({})).toEqual({ status: 'empty', data: {} });
      expect(parseAuditMetadata([])).toEqual({ status: 'empty', data: [] });
    });

    it('parses direct JavaScript objects', () => {
      const obj = { service: 'Plumbing', price: 499 };
      const res = parseAuditMetadata(obj);
      expect(res.status).toBe('object');
      expect(res.data).toEqual(obj);
    });

    it('parses valid JSON strings', () => {
      const jsonStr = '{"newStatus":"In Progress","price":499}';
      const res = parseAuditMetadata(jsonStr);
      expect(res.status).toBe('object');
      expect(res.data).toEqual({ newStatus: 'In Progress', price: 499 });
    });

    it('unwraps nested/double-serialized JSON strings cleanly', () => {
      const doubleStr = JSON.stringify('{"service":"Electrical","price":399}');
      const res = parseAuditMetadata(doubleStr);
      expect(res.status).toBe('object');
      expect(res.data).toEqual({ service: 'Electrical', price: 399 });
    });

    it('identifies malformed JSON safely without throwing', () => {
      const broken = '{"newStatus": "In Progress" broken';
      const res = parseAuditMetadata(broken);
      expect(res.status).toBe('malformed');
      expect(res.rawString).toBe(broken);
    });

    it('handles arrays and primitives', () => {
      const arr = ['Plumbing', 'Renovation'];
      expect(parseAuditMetadata(arr)).toEqual({ status: 'array', data: arr });

      const prim = 'Simple status text';
      expect(parseAuditMetadata(prim)).toEqual({ status: 'primitive', data: 'Simple status text' });
    });
  });

  describe('formatLabel', () => {
    it('uses human-readable labels from predefined map', () => {
      expect(formatLabel('newStatus')).toBe('New Status');
      expect(formatLabel('previousStatus')).toBe('Previous Status');
      expect(formatLabel('service')).toBe('Service');
      expect(formatLabel('price')).toBe('Price');
      expect(formatLabel('slot')).toBe('Time Slot');
      expect(formatLabel('professionalName')).toBe('Professional');
      expect(formatLabel('professionalId')).toBe('Professional ID');
    });

    it('converts camelCase and snake_case cleanly to Title Case', () => {
      expect(formatLabel('assigned_technician_name')).toBe('Assigned Technician Name');
      expect(formatLabel('customerNote')).toBe('Customer Note');
    });
  });

  describe('formatDateSafe', () => {
    it('formats YYYY-MM-DD consistently without timezone shifting', () => {
      expect(formatDateSafe('2026-11-11')).toBe('11 Nov 2026');
      expect(formatDateSafe('2026-01-05')).toBe('5 Jan 2026');
      expect(formatDateSafe('2026-12-31')).toBe('31 Dec 2026');
    });

    it('formats ISO timestamps by preserving calendar date part', () => {
      expect(formatDateSafe('2026-10-18T14:30:00.000Z')).toBe('18 Oct 2026');
    });

    it('preserves non-date strings safely', () => {
      expect(formatDateSafe('N/A')).toBe('N/A');
    });
  });

  describe('formatSingleValue', () => {
    it('redacts sensitive security keys', () => {
      expect(formatSingleValue('password', 'Secret@123')).toBe('[REDACTED]');
      expect(formatSingleValue('auth_token', 'xyz-abc-123')).toBe('[REDACTED]');
      expect(formatSingleValue('private_key', 'private_value')).toBe('[REDACTED]');
    });

    it('formats INR monetary values with rupee symbol', () => {
      expect(formatSingleValue('price', 499)).toBe('₹499');
      expect(formatSingleValue('agreed_price_inr', 1299)).toBe('₹1,299');
      expect(formatSingleValue('oldPrice', 399)).toBe('₹399');
      expect(formatSingleValue('price', '499')).toBe('₹499');
    });

    it('formats booleans into human Yes/No', () => {
      expect(formatSingleValue('profReassigned', false)).toBe('No');
      expect(formatSingleValue('profReassigned', true)).toBe('Yes');
    });

    it('formats active flags into Active/Inactive', () => {
      expect(formatSingleValue('active', 1)).toBe('Active');
      expect(formatSingleValue('is_active', 0)).toBe('Inactive');
    });

    it('formats time slots with en-dash', () => {
      expect(formatSingleValue('slot', '09:00 - 11:00')).toBe('09:00–11:00');
    });

    it('formats duration in minutes', () => {
      expect(formatSingleValue('duration', 60)).toBe('60 mins');
    });

    it('formats decimal monetary amounts accurately', () => {
      expect(formatSingleValue('price', 499.5)).toMatch(/₹499\.5/);
      expect(formatSingleValue('amount', '1250.75')).toMatch(/₹1,250\.75/);
    });

    it('redacts sensitive keys regardless of case or nested key context', () => {
      expect(formatSingleValue('user_password', 'p@ss123')).toBe('[REDACTED]');
      expect(formatSingleValue('clientSecret', 'sec_999')).toBe('[REDACTED]');
      expect(formatSingleValue('jwt_token', 'eyJhb...')).toBe('[REDACTED]');
    });
  });

  describe('Nested and complex structures', () => {
    it('parses nested objects properly for structured rendering', () => {
      const nested = {
        booking: { service: 'Plumbing', price: 499 },
        customer: { name: 'Test Customer' },
      };
      const res = parseAuditMetadata(nested);
      expect(res.status).toBe('object');
      const data = res.data as typeof nested;
      expect(data.booking.service).toBe('Plumbing');
      expect(data.booking.price).toBe(499);
      expect(data.customer.name).toBe('Test Customer');
    });

    it('parses nested stringified JSON objects', () => {
      const nestedStr = '{"booking":{"service":"Plumbing","price":499},"customer":{"name":"Test Customer"}}';
      const res = parseAuditMetadata(nestedStr);
      expect(res.status).toBe('object');
      const data = res.data as { booking: { service: string; price: number }; customer: { name: string } };
      expect(data.booking.service).toBe('Plumbing');
      expect(data.booking.price).toBe(499);
      expect(data.customer.name).toBe('Test Customer');
    });
  });
});
