import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { generateToken, authenticateToken, AuthenticatedRequest } from '../auth';
import { createAuditLog } from '../helpers';

const router = Router();

// Register as customer (public registration NEVER creates admin)
router.post('/register', (req, res: Response) => {
  const { full_name, email, phone, password, address, locality } = req.body;

  if (!full_name || !email || !phone || !password) {
    return res.status(400).json({ error: 'Full name, email, phone number, and password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  // Check duplicate
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  const userId = `usr_cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const passwordHash = bcrypt.hashSync(String(password), 10);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO users (id, full_name, email, phone, password_hash, role, address, locality, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'customer', ?, ?, 'active', ?, ?)
    `).run(
      userId,
      String(full_name).trim(),
      cleanEmail,
      String(phone).trim(),
      passwordHash,
      address ? String(address).trim() : null,
      locality ? String(locality).trim() : null,
      now,
      now
    );

    const authUser = {
      id: userId,
      email: cleanEmail,
      role: 'customer' as const,
      full_name: String(full_name).trim(),
    };

    const token = generateToken(authUser);

    createAuditLog(userId, String(full_name).trim(), 'customer', 'CUSTOMER_REGISTER', 'user', userId, {
      email: cleanEmail,
    });

    return res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: userId,
        full_name: String(full_name).trim(),
        email: cleanEmail,
        phone: String(phone).trim(),
        role: 'customer',
        address: address ? String(address).trim() : null,
        locality: locality ? String(locality).trim() : null,
      },
    });
  } catch (err: unknown) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// Login (Customer or Admin)
router.post('/login', (req, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  const user = db.prepare(`
    SELECT id, full_name, email, phone, password_hash, role, address, locality, status
    FROM users
    WHERE email = ?
  `).get(cleanEmail) as {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    password_hash: string;
    role: 'customer' | 'admin';
    address: string | null;
    locality: string | null;
    status: string;
  } | undefined;

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Your account is currently suspended. Please contact support.' });
  }

  const passwordValid = bcrypt.compareSync(String(password), user.password_hash);
  if (!passwordValid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
  });

  createAuditLog(user.id, user.full_name, user.role, 'USER_LOGIN', 'user', user.id);

  return res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      address: user.address,
      locality: user.locality,
    },
  });
});

// Get current logged-in user profile & unread notification count
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = db.prepare(`
    SELECT id, full_name, email, phone, role, address, locality, created_at
    FROM users
    WHERE id = ?
  `).get(req.user!.id) as {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: 'customer' | 'admin';
    address: string | null;
    locality: string | null;
    created_at: string;
  } | undefined;

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE recipient_user_id = ? AND is_read = 0
  `).get(user.id) as { count: number };

  return res.json({
    user,
    unreadNotifications: unreadCount.count,
  });
});

// Update profile details
router.put('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { full_name, phone, address, locality } = req.body;
  const userId = req.user!.id;
  const now = new Date().toISOString();

  if (!full_name || !phone) {
    return res.status(400).json({ error: 'Full name and phone number cannot be empty.' });
  }

  db.prepare(`
    UPDATE users
    SET full_name = ?, phone = ?, address = ?, locality = ?, updated_at = ?
    WHERE id = ?
  `).run(
    String(full_name).trim(),
    String(phone).trim(),
    address ? String(address).trim() : null,
    locality ? String(locality).trim() : null,
    now,
    userId
  );

  createAuditLog(userId, String(full_name).trim(), req.user!.role, 'PROFILE_UPDATE', 'user', userId);

  return res.json({
    message: 'Profile updated successfully.',
    user: {
      id: userId,
      full_name: String(full_name).trim(),
      email: req.user!.email,
      phone: String(phone).trim(),
      role: req.user!.role,
      address: address ? String(address).trim() : null,
      locality: locality ? String(locality).trim() : null,
    },
  });
});

// Logout endpoint
router.post('/logout', (_req, res: Response) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully.' });
});

export default router;
