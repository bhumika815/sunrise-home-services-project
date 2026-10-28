import { describe, it, expect, vi } from 'vitest';
import {
  generateToken,
  authenticateToken,
  requireAdmin,
  requireCustomer,
  AuthUser,
  AuthenticatedRequest,
} from './auth';
import { Response } from 'express';
import { initDatabase } from './db';
import jwt from 'jsonwebtoken';

describe('Server Authentication & Authorization Functions Unit Tests', () => {
  initDatabase();

  const testCustomer: AuthUser = {
    id: 'usr_cust_001',
    email: 'customer@demo.com',
    role: 'customer',
    full_name: 'Pooja Joshi',
  };

  const testAdmin: AuthUser = {
    id: 'usr_admin_001',
    email: 'admin@sunrisehomeservices.com',
    role: 'admin',
    full_name: 'Suresh Patil (Operations Manager)',
  };

  describe('generateToken()', () => {
    it('creates a signed JWT token containing user credentials', () => {
      const token = generateToken(testCustomer);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      const decoded = jwt.decode(token) as AuthUser;
      expect(decoded.id).toBe(testCustomer.id);
      expect(decoded.email).toBe(testCustomer.email);
      expect(decoded.role).toBe('customer');
      expect(decoded.full_name).toBe(testCustomer.full_name);
    });
  });

  describe('authenticateToken() middleware', () => {
    it('authenticates valid Bearer token from authorization header', () => {
      const token = generateToken(testCustomer);
      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as unknown as AuthenticatedRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn();

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user!.id).toBe(testCustomer.id);
      expect(req.user!.role).toBe('customer');
    });

    it('authenticates valid token from cookies', () => {
      const token = generateToken(testAdmin);
      const req = {
        headers: {},
        cookies: { token },
      } as unknown as AuthenticatedRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn();

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user!.role).toBe('admin');
    });

    it('rejects request with missing token (401)', () => {
      const req = { headers: {} } as unknown as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Authentication required/i) }));
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects invalid or corrupted token (401)', () => {
      const req = {
        headers: { authorization: 'Bearer invalid.token.payload' },
      } as unknown as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Invalid or expired/i) }));
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects deleted or suspended user token (403)', () => {
      const fakeToken = generateToken({
        id: 'usr_nonexistent_999',
        email: 'ghost@test.com',
        role: 'customer',
        full_name: 'Ghost User',
      });

      const req = {
        headers: { authorization: `Bearer ${fakeToken}` },
      } as unknown as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/suspended or no longer exists/i) }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin() middleware', () => {
    it('allows access when user has admin role', () => {
      const req = { user: testAdmin } as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      requireAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('denies access when user is a customer (403)', () => {
      const req = { user: testCustomer } as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Administrator privileges required/i) }));
      expect(next).not.toHaveBeenCalled();
    });

    it('denies access when req.user is undefined (403)', () => {
      const req = {} as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireCustomer() middleware', () => {
    it('allows access when user has customer role', () => {
      const req = { user: testCustomer } as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      requireCustomer(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('denies access when user is an admin (403)', () => {
      const req = { user: testAdmin } as AuthenticatedRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      requireCustomer(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Customer privileges required/i) }));
      expect(next).not.toHaveBeenCalled();
    });
  });
});
