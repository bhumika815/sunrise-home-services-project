import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
const DB_PATH = process.env.DATABASE_PATH || (isTestEnv ? path.join(DB_DIR, 'test_sunrise.db') : path.join(DB_DIR, 'sunrise.db'));
export const db = new Database(DB_PATH);

// Enable foreign keys and WAL mode for reliability and performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    -- Users Table (Customers and Admins)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('customer', 'admin')),
      address TEXT,
      locality TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Services Table
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Plumbing', 'Electrical', 'Air Conditioning', 'Renovation', 'Other')),
      description TEXT NOT NULL,
      price_inr INTEGER NOT NULL,
      estimated_duration_min INTEGER NOT NULL,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Service Professionals Table
    CREATE TABLE IF NOT EXISTS professionals (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      categories TEXT NOT NULL, -- JSON array of strings
      service_areas TEXT NOT NULL, -- JSON array of Pune localities
      is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Bookings Table
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES users(id),
      service_id TEXT NOT NULL REFERENCES services(id),
      service_name_snapshot TEXT NOT NULL,
      agreed_price_inr INTEGER NOT NULL,
      service_address TEXT NOT NULL,
      locality TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      booking_date TEXT NOT NULL, -- YYYY-MM-DD
      time_slot TEXT NOT NULL,
      problem_description TEXT NOT NULL,
      additional_instructions TEXT,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled')),
      cancellation_reason TEXT,
      cancelled_at TEXT,
      assigned_professional_id TEXT REFERENCES professionals(id),
      assigned_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Booking Status History
    CREATE TABLE IF NOT EXISTS booking_status_history (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by_user_id TEXT NOT NULL REFERENCES users(id),
      change_reason TEXT,
      created_at TEXT NOT NULL
    );

    -- In-App Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0, 1)),
      created_at TEXT NOT NULL
    );

    -- Reviews Table (Linked to completed bookings)
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL REFERENCES users(id),
      service_id TEXT NOT NULL REFERENCES services(id),
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      moderation_status TEXT NOT NULL DEFAULT 'Approved' CHECK(moderation_status IN ('Pending', 'Approved', 'Rejected')),
      moderated_by_user_id TEXT REFERENCES users(id),
      moderated_at TEXT,
      created_at TEXT NOT NULL
    );

    -- Enquiries / Contact Requests Table
    CREATE TABLE IF NOT EXISTS enquiries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      service_requested TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'In Progress', 'Resolved')),
      internal_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Audit Logs Table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    -- Indexes for query optimization
    CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
    CREATE INDEX IF NOT EXISTS idx_bookings_prof ON bookings(assigned_professional_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(recipient_user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    return; // Already initialized, never wipe existing user data
  }

  const now = new Date().toISOString();

  // 1. Seed Administrator
  const adminId = 'usr_admin_001';
  const adminPasswordHash = bcrypt.hashSync('AdminSecure@2026', 10);
  db.prepare(`
    INSERT INTO users (id, full_name, email, phone, password_hash, role, address, locality, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    adminId,
    'Suresh Patil (Operations Manager)',
    'admin@sunrisehomeservices.com',
    '+91 98765 43210',
    adminPasswordHash,
    'admin',
    'Office 402, Sunrise Towers, FC Road',
    'Shivajinagar, Pune',
    'active',
    now,
    now
  );

  // 2. Seed Demo Customer
  const customerId = 'usr_cust_001';
  const customerPasswordHash = bcrypt.hashSync('CustomerDemo@2026', 10);
  db.prepare(`
    INSERT INTO users (id, full_name, email, phone, password_hash, role, address, locality, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    customerId,
    'Pooja Joshi',
    'customer@demo.com',
    '+91 98220 12345',
    customerPasswordHash,
    'customer',
    'Flat 304, Mayur Elegance, Paud Road',
    'Kothrud, Pune',
    'active',
    now,
    now
  );

  // 3. Seed Services Catalogue with realistic Pune pricing
  const services = [
    {
      id: 'srv_plumb_01',
      name: 'Pipe Leakage & Tap Repair',
      category: 'Plumbing',
      description: 'Diagnosis and swift repair of dripping taps, mixer valves, internal pipeline seepages, and drain connections.',
      price_inr: 499,
      duration: 60,
      image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'srv_plumb_02',
      name: 'Complete Bathroom Fittings & Sanitary Ware',
      category: 'Plumbing',
      description: 'Installation and servicing of washbasins, western commodes, health faucets, shower heads, and concealed cisterns.',
      price_inr: 999,
      duration: 120,
      image_url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'srv_plumb_03',
      name: 'Water Tank Deep Cleaning & Disinfection',
      category: 'Plumbing',
      description: 'High-pressure mechanical rotary cleaning, sludge removal, and UV disinfection for overhead and underground tanks up to 2000L.',
      price_inr: 1299,
      duration: 150,
      image_url: 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'srv_elec_01',
      name: 'Switchboard, Socket & MCB Repairs',
      category: 'Electrical',
      description: 'Fault finding, switch replacement, circuit breaker repair, and heavy power point installation for geysers and ovens.',
      price_inr: 399,
      duration: 45,
      image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'srv_elec_02',
      name: 'Fan, Chandelier & Decorative Lighting Setup',
      category: 'Electrical',
      description: 'Safe mounting of ceiling fans, false ceiling LED cove lights, profile strips, wall sconces, and delicate chandeliers.',
      price_inr: 699,
      duration: 90,
      image_url: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'srv_elec_03',
      name: 'Complete Home Electrical Safety Audit & Rewiring',
      category: 'Electrical',
      description: 'Comprehensive insulation resistance check, earthing audit, load balancing, and targeted wire replacement across the home.',
      price_inr: 1899,
      duration: 180,
      image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'srv_ac_01',
      name: 'Split & Window AC Jet Servicing',
      category: 'Air Conditioning',
      description: 'Pressure jet wash of indoor cooling coils and outdoor condensers, air filter sanitization, drain tray de-clogging, and temperature check.',
      price_inr: 649,
      duration: 60,
      image_url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'srv_ac_02',
      name: 'AC Refrigerant Gas Leak Check & Refill',
      category: 'Air Conditioning',
      description: 'Nitrogen pressure testing, copper valve brazing, vacuum evacuation, and 100% genuine R32 / R410A gas top-up with cooling warranty.',
      price_inr: 2199,
      duration: 90,
      image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'srv_ac_03',
      name: 'AC Uninstallation & New Installation',
      category: 'Air Conditioning',
      description: 'Precise core drilling, outdoor bracket fixing, vibration dampener mounting, copper piping insulation, and performance calibration.',
      price_inr: 1799,
      duration: 120,
      image_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'srv_renov_01',
      name: 'Interior Wall Painting & Touch-up',
      category: 'Renovation',
      description: 'Two coats of premium emulsion (Asian Paints / Nerolac), surface putty smoothing, primer coat, and dust-free floor protection.',
      price_inr: 4499,
      duration: 360,
      image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'srv_renov_02',
      name: 'Bathroom & Balcony Waterproofing',
      category: 'Renovation',
      description: 'Advanced polymer-modified cementitious coating, tile joint epoxy grouting, and anti-leak chemical barrier treatment.',
      price_inr: 3799,
      duration: 240,
      image_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'srv_renov_03',
      name: 'Modular Kitchen Remodeling & Carpentry',
      category: 'Renovation',
      description: 'Hinge realignment, soft-close hydraulic drawer fitting, acrylic shutter resurfacing, and custom countertop alterations.',
      price_inr: 6999,
      duration: 480,
      image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80'
    }
  ];

  const insertService = db.prepare(`
    INSERT INTO services (id, name, category, description, price_inr, estimated_duration_min, image_url, is_active, created_at, updated_at)
    VALUES (@id, @name, @category, @description, @price_inr, @duration, @image_url, 1, @now, @now)
  `);

  for (const s of services) {
    insertService.run({ ...s, now });
  }

  // 4. Seed Verified Field Professionals in Pune
  const professionals = [
    {
      id: 'prof_001',
      name: 'Santosh Kulkarni',
      email: 'santosh.kulkarni@sunrisehomeservices.com',
      phone: '+91 98231 44556',
      categories: JSON.stringify(['Plumbing', 'Renovation']),
      areas: JSON.stringify(['Kothrud', 'Karve Nagar', 'Deccan', 'Shivajinagar', 'Aundh'])
    },
    {
      id: 'prof_002',
      name: 'Ganesh Shinde',
      email: 'ganesh.shinde@sunrisehomeservices.com',
      phone: '+91 97654 33221',
      categories: JSON.stringify(['Electrical']),
      areas: JSON.stringify(['Baner', 'Balewadi', 'Wakad', 'Hinjewadi', 'Pimple Saudagar'])
    },
    {
      id: 'prof_003',
      name: 'Vinod More',
      email: 'vinod.more@sunrisehomeservices.com',
      phone: '+91 99223 88771',
      categories: JSON.stringify(['Air Conditioning', 'Electrical']),
      areas: JSON.stringify(['Viman Nagar', 'Kalyani Nagar', 'Koregaon Park', 'Magarpatta', 'Hadapsar'])
    },
    {
      id: 'prof_004',
      name: 'Mahesh Jadhav',
      email: 'mahesh.jadhav@sunrisehomeservices.com',
      phone: '+91 98501 22334',
      categories: JSON.stringify(['Renovation', 'Plumbing']),
      areas: JSON.stringify(['Kothrud', 'Bavdhan', 'Pashan', 'Baner', 'Warje'])
    }
  ];

  const insertProf = db.prepare(`
    INSERT INTO professionals (id, full_name, email, phone, categories, service_areas, is_active, created_at, updated_at)
    VALUES (@id, @name, @email, @phone, @categories, @areas, 1, @now, @now)
  `);

  for (const p of professionals) {
    insertProf.run({ ...p, now });
  }

  // 5. Seed Real Initial Completed Bookings & Verified Customer Reviews
  const seededBookingId = 'SHS-20261010-1042';
  db.prepare(`
    INSERT INTO bookings (
      id, customer_id, service_id, service_name_snapshot, agreed_price_inr,
      service_address, locality, contact_number, booking_date, time_slot,
      problem_description, additional_instructions, status,
      assigned_professional_id, assigned_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?, ?, ?, ?)
  `).run(
    seededBookingId,
    customerId,
    'srv_plumb_01',
    'Pipe Leakage & Tap Repair',
    499,
    'Flat 304, Mayur Elegance, Paud Road',
    'Kothrud',
    '+91 98220 12345',
    '2026-10-10',
    '11:00 - 13:00',
    'Kitchen sink faucet pipe leaking continuously and low water pressure.',
    'Please call 10 mins before arrival.',
    'prof_001',
    now,
    now,
    now
  );

  // Status history
  db.prepare(`
    INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by_user_id, change_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('bsh_001', seededBookingId, 'Pending', 'Confirmed', adminId, 'Booking confirmed with technician assignment', now);

  db.prepare(`
    INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by_user_id, change_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('bsh_002', seededBookingId, 'Confirmed', 'Completed', adminId, 'Job successfully performed and verified', now);

  // Seed customer reviews
  const initialReviews = [
    {
      id: 'rev_001',
      booking_id: seededBookingId,
      customer_id: customerId,
      service_id: 'srv_plumb_01',
      rating: 5,
      comment: 'Excellent plumbing service. The technician Santosh arrived on time and fixed the leak quickly. Very professional and polite!',
      status: 'Approved'
    }
  ];

  for (const r of initialReviews) {
    db.prepare(`
      INSERT INTO reviews (id, booking_id, customer_id, service_id, rating, comment, moderation_status, moderated_by_user_id, moderated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(r.id, r.booking_id, r.customer_id, r.service_id, r.rating, r.comment, r.status, adminId, now, now);
  }

  // 6. Seed Sample Contact Enquiries
  db.prepare(`
    INSERT INTO enquiries (id, name, email, phone, service_requested, message, status, internal_notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'New', ?, ?, ?)
  `).run(
    'enq_001',
    'Rahul Sharma',
    'rahul.sharma@gmail.com',
    '+91 98901 11223',
    'Air Conditioning',
    'Need AC deep jet service for 2 split ACs before summer season in Baner.',
    'Customer requested Saturday morning slot if possible.',
    now,
    now
  );

  // 7. Seed Initial Welcome Notification
  db.prepare(`
    INSERT INTO notifications (id, recipient_user_id, booking_id, title, message, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(
    'notif_001',
    customerId,
    seededBookingId,
    'Booking Completed Successfully',
    'Your Pipe Leakage & Tap Repair service (SHS-20261010-1042) was marked as completed. Thank you for choosing Sunrise Home Services!',
    now
  );

  // 8. Seed Initial Audit Log
  db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'aud_001',
    adminId,
    'Suresh Patil',
    'admin',
    'SYSTEM_BOOTSTRAP',
    'system',
    'database',
    JSON.stringify({ message: 'Sunrise Home Services database initialized with full catalog and role accounts' }),
    now
  );
}
