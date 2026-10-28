import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../auth';

const router = Router();

function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  let str = String(value);
  // Prevent spreadsheet formula injection (=, +, -, @, \t, \r)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // RFC 4180 double-quote escaping
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

// GET Admin Summary Report
router.get('/summary', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const hasDateFilter = Boolean(
    startDate &&
    endDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(endDate)
  );

  const dateClause = hasDateFilter ? 'WHERE booking_date >= ? AND booking_date <= ?' : '';
  const dateParams = hasDateFilter ? [startDate!, endDate!] : [];

  // Total bookings
  const totalBookingsQuery = dateClause
    ? `SELECT COUNT(*) as count FROM bookings ${dateClause}`
    : 'SELECT COUNT(*) as count FROM bookings';
  const totalBookings = db.prepare(totalBookingsQuery).get(...dateParams) as { count: number };

  // Status breakdown
  const statusQuery = dateClause
    ? `SELECT status, COUNT(*) as count FROM bookings ${dateClause} GROUP BY status`
    : 'SELECT status, COUNT(*) as count FROM bookings GROUP BY status';
  const statusRows = db.prepare(statusQuery).all(...dateParams) as { status: string; count: number }[];

  const statusCounts: Record<string, number> = {
    Pending: 0,
    Confirmed: 0,
    'In Progress': 0,
    Completed: 0,
    Cancelled: 0,
  };
  for (const row of statusRows) {
    statusCounts[row.status] = row.count;
  }

  // Financial values
  const financialQuery = dateClause
    ? `
      SELECT 
        SUM(CASE WHEN status = 'Completed' THEN agreed_price_inr ELSE 0 END) as completed_value,
        SUM(CASE WHEN status IN ('Pending', 'Confirmed', 'In Progress') THEN agreed_price_inr ELSE 0 END) as active_value,
        SUM(CASE WHEN status != 'Cancelled' THEN agreed_price_inr ELSE 0 END) as estimated_value,
        COUNT(CASE WHEN status != 'Cancelled' THEN 1 END) as qualifying_count
      FROM bookings
      ${dateClause}
    `
    : `
      SELECT 
        SUM(CASE WHEN status = 'Completed' THEN agreed_price_inr ELSE 0 END) as completed_value,
        SUM(CASE WHEN status IN ('Pending', 'Confirmed', 'In Progress') THEN agreed_price_inr ELSE 0 END) as active_value,
        SUM(CASE WHEN status != 'Cancelled' THEN agreed_price_inr ELSE 0 END) as estimated_value,
        COUNT(CASE WHEN status != 'Cancelled' THEN 1 END) as qualifying_count
      FROM bookings
    `;
  const financialTotals = db.prepare(financialQuery).get(...dateParams) as {
    completed_value: number | null;
    active_value: number | null;
    estimated_value: number | null;
    qualifying_count: number;
  };

  const completedRevenue = financialTotals.completed_value || 0;
  const activeBookingValue = financialTotals.active_value || 0;
  const estimatedBookingValue = financialTotals.estimated_value || 0;
  const qualifyingCount = financialTotals.qualifying_count || 0;
  const averageTicketSize = qualifyingCount > 0 ? Math.round(estimatedBookingValue / qualifyingCount) : 0;

  // Bookings by category
  const categoryQuery = dateClause
    ? `
      SELECT s.category, COUNT(b.id) as booking_count, SUM(b.agreed_price_inr) as total_value
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.booking_date >= ? AND b.booking_date <= ?
      GROUP BY s.category
      ORDER BY booking_count DESC
    `
    : `
      SELECT s.category, COUNT(b.id) as booking_count, SUM(b.agreed_price_inr) as total_value
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      GROUP BY s.category
      ORDER BY booking_count DESC
    `;
  const categoryStats = db.prepare(categoryQuery).all(...dateParams);

  // Technician workload
  const techQuery = dateClause
    ? `
      SELECT p.id, p.full_name, COUNT(b.id) as assigned_jobs,
             SUM(CASE WHEN b.status = 'Completed' THEN 1 ELSE 0 END) as completed_jobs,
             SUM(CASE WHEN b.status IN ('Confirmed', 'In Progress') THEN 1 ELSE 0 END) as active_jobs
      FROM professionals p
      LEFT JOIN bookings b ON p.id = b.assigned_professional_id 
        AND b.status != 'Cancelled'
        AND b.booking_date >= ? AND b.booking_date <= ?
      GROUP BY p.id
      ORDER BY assigned_jobs DESC
    `
    : `
      SELECT p.id, p.full_name, COUNT(b.id) as assigned_jobs,
             SUM(CASE WHEN b.status = 'Completed' THEN 1 ELSE 0 END) as completed_jobs,
             SUM(CASE WHEN b.status IN ('Confirmed', 'In Progress') THEN 1 ELSE 0 END) as active_jobs
      FROM professionals p
      LEFT JOIN bookings b ON p.id = b.assigned_professional_id AND b.status != 'Cancelled'
      GROUP BY p.id
      ORDER BY assigned_jobs DESC
    `;
  const technicianStats = db.prepare(techQuery).all(...dateParams);

  // Overall counts
  const customersCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get() as { count: number };
  const activeProfsCount = db.prepare('SELECT COUNT(*) as count FROM professionals WHERE is_active = 1').get() as { count: number };
  const activeServicesCount = db.prepare('SELECT COUNT(*) as count FROM services WHERE is_active = 1').get() as { count: number };
  const pendingEnquiriesCount = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE status = 'New'").get() as { count: number };

  return res.json({
    metrics: {
      totalBookings: totalBookings.count,
      statusCounts,
      completedValueInr: completedRevenue,
      activeBookingValueInr: activeBookingValue,
      estimatedValueInr: estimatedBookingValue,
      averageTicketSizeInr: averageTicketSize,
      totalCustomers: customersCount.count,
      activeProfessionals: activeProfsCount.count,
      activeServices: activeServicesCount.count,
      pendingEnquiries: pendingEnquiriesCount.count,
    },
    categoryStats,
    technicianStats,
    appliedFilter: hasDateFilter ? { startDate, endDate } : null,
  });
});

// GET Export CSV (Admin only)
router.get('/export-csv', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { type, startDate, endDate } = req.query as { type?: string; startDate?: string; endDate?: string };
  const hasDateFilter = Boolean(
    startDate &&
    endDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(endDate)
  );

  const nowStr = new Date().toISOString().slice(0, 10);
  let csv = '';
  let filename = 'export.csv';

  if (type === 'bookings') {
    filename = `sunrise-bookings-${hasDateFilter ? `${startDate}_to_${endDate}` : nowStr}.csv`;
    const query = hasDateFilter
      ? `
        SELECT b.id, u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
               b.service_name_snapshot, b.agreed_price_inr, b.booking_date, b.time_slot,
               b.locality, b.service_address, b.status, p.full_name as assigned_professional, b.created_at
        FROM bookings b
        JOIN users u ON b.customer_id = u.id
        LEFT JOIN professionals p ON b.assigned_professional_id = p.id
        WHERE b.booking_date >= ? AND b.booking_date <= ?
        ORDER BY b.booking_date DESC, b.created_at DESC
      `
      : `
        SELECT b.id, u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
               b.service_name_snapshot, b.agreed_price_inr, b.booking_date, b.time_slot,
               b.locality, b.service_address, b.status, p.full_name as assigned_professional, b.created_at
        FROM bookings b
        JOIN users u ON b.customer_id = u.id
        LEFT JOIN professionals p ON b.assigned_professional_id = p.id
        ORDER BY b.booking_date DESC, b.created_at DESC
      `;
    const rows = (hasDateFilter ? db.prepare(query).all(startDate, endDate) : db.prepare(query).all()) as Record<string, unknown>[];

    const headers = [
      'Booking ID',
      'Customer Name',
      'Email',
      'Phone',
      'Service',
      'Price (INR)',
      'Date',
      'Time Slot',
      'Locality',
      'Service Address',
      'Status',
      'Assigned Technician',
      'Created At',
    ];
    csv = headers.join(',') + '\n';
    for (const r of rows) {
      csv += [
        sanitizeCsvCell(r.id),
        sanitizeCsvCell(r.customer_name),
        sanitizeCsvCell(r.customer_email),
        sanitizeCsvCell(r.customer_phone),
        sanitizeCsvCell(r.service_name_snapshot),
        r.agreed_price_inr,
        sanitizeCsvCell(r.booking_date),
        sanitizeCsvCell(r.time_slot),
        sanitizeCsvCell(r.locality),
        sanitizeCsvCell(r.service_address),
        sanitizeCsvCell(r.status),
        sanitizeCsvCell(r.assigned_professional || 'Unassigned'),
        sanitizeCsvCell(r.created_at),
      ].join(',') + '\n';
    }
  } else if (type === 'services') {
    filename = `sunrise-services-${nowStr}.csv`;
    const rows = db.prepare('SELECT id, name, category, description, price_inr, estimated_duration_min, is_active, created_at FROM services ORDER BY category ASC, name ASC').all() as Record<string, unknown>[];

    const headers = [
      'Service ID',
      'Name',
      'Category',
      'Description',
      'Price (INR)',
      'Duration (mins)',
      'Status',
      'Created At',
    ];
    csv = headers.join(',') + '\n';
    for (const r of rows) {
      csv += [
        sanitizeCsvCell(r.id),
        sanitizeCsvCell(r.name),
        sanitizeCsvCell(r.category),
        sanitizeCsvCell(r.description),
        r.price_inr,
        r.estimated_duration_min,
        sanitizeCsvCell(r.is_active ? 'Active' : 'Inactive'),
        sanitizeCsvCell(r.created_at),
      ].join(',') + '\n';
    }
  } else if (type === 'customers') {
    filename = `sunrise-customers-${nowStr}.csv`;
    const rows = db.prepare("SELECT id, full_name, email, phone, locality, address, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC").all() as Record<string, unknown>[];

    const headers = [
      'Customer ID',
      'Full Name',
      'Email',
      'Phone',
      'Locality',
      'Address',
      'Joined At',
    ];
    csv = headers.join(',') + '\n';
    for (const r of rows) {
      csv += [
        sanitizeCsvCell(r.id),
        sanitizeCsvCell(r.full_name),
        sanitizeCsvCell(r.email),
        sanitizeCsvCell(r.phone),
        sanitizeCsvCell(r.locality || ''),
        sanitizeCsvCell(r.address || ''),
        sanitizeCsvCell(r.created_at),
      ].join(',') + '\n';
    }
  } else if (type === 'enquiries') {
    filename = `sunrise-enquiries-${hasDateFilter ? `${startDate}_to_${endDate}` : nowStr}.csv`;
    const query = hasDateFilter
      ? 'SELECT id, name, email, phone, service_requested, message, status, internal_notes, created_at FROM enquiries WHERE DATE(created_at) >= ? AND DATE(created_at) <= ? ORDER BY created_at DESC'
      : 'SELECT id, name, email, phone, service_requested, message, status, internal_notes, created_at FROM enquiries ORDER BY created_at DESC';
    const rows = (hasDateFilter ? db.prepare(query).all(startDate, endDate) : db.prepare(query).all()) as Record<string, unknown>[];

    const headers = [
      'Enquiry ID',
      'Name',
      'Email',
      'Phone',
      'Service Requested',
      'Message',
      'Status',
      'Internal Notes',
      'Created At',
    ];
    csv = headers.join(',') + '\n';
    for (const r of rows) {
      csv += [
        sanitizeCsvCell(r.id),
        sanitizeCsvCell(r.name),
        sanitizeCsvCell(r.email),
        sanitizeCsvCell(r.phone),
        sanitizeCsvCell(r.service_requested || 'General Enquiry'),
        sanitizeCsvCell(r.message || ''),
        sanitizeCsvCell(r.status),
        sanitizeCsvCell(r.internal_notes || ''),
        sanitizeCsvCell(r.created_at),
      ].join(',') + '\n';
    }
  } else {
    return res.status(400).json({ error: 'Invalid export type. Use bookings, services, customers, or enquiries.' });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
});

export default router;
