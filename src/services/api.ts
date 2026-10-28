// Client API Service for Sunrise Home Services
export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  address?: string | null;
  locality?: string | null;
}

export interface Service {
  id: string;
  name: string;
  category: 'Plumbing' | 'Electrical' | 'Air Conditioning' | 'Renovation' | 'Other';
  description: string;
  price_inr: number;
  estimated_duration_min: number;
  image_url?: string | null;
  is_active: number;
  created_at: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  service_id: string;
  service_name_snapshot: string;
  agreed_price_inr: number;
  service_address: string;
  locality: string;
  contact_number: string;
  booking_date: string;
  time_slot: string;
  problem_description: string;
  additional_instructions?: string | null;
  status: 'Pending' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  assigned_professional_id?: string | null;
  assigned_at?: string | null;
  professional_name?: string | null;
  professional_phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingStatusHistory {
  id: string;
  booking_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by_name: string;
  changed_by_role: string;
  change_reason?: string | null;
  created_at: string;
}

export interface Professional {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  categories: string[];
  service_areas: string[];
  is_active: number;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_name: string;
  service_name: string;
  service_category?: string;
  rating: number;
  comment: string;
  moderation_status?: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
}

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_requested?: string | null;
  message: string;
  status: 'New' | 'In Progress' | 'Resolved';
  internal_notes?: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  recipient_user_id: string;
  booking_id?: string | null;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ReportSummary {
  metrics: {
    totalBookings: number;
    statusCounts: Record<string, number>;
    estimatedValueInr: number;
    completedValueInr: number;
    activeBookingValueInr?: number;
    averageTicketSizeInr?: number;
    totalCustomers: number;
    activeProfessionals: number;
    activeServices: number;
    pendingEnquiries: number;
  };
  categoryStats: Array<{
    category: string;
    booking_count: number;
    total_value: number;
  }>;
  technicianStats: Array<{
    id: string;
    full_name: string;
    assigned_jobs: number;
    completed_jobs: number;
    active_jobs?: number;
  }>;
  appliedFilter?: { startDate: string; endDate: string } | null;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('shs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Services
  getServices: (params?: { category?: string; search?: string; sort?: string; includeInactive?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All') query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.includeInactive) query.set('includeInactive', 'true');
    return request<{ services: Service[] }>(`/api/services?${query.toString()}`);
  },
  getService: (id: string) => request<{ service: Service }>(`/api/services/${id}`),
  createService: (data: Partial<Service>) => request<{ message: string; service: Service }>('/api/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id: string, data: Partial<Service>) => request<{ message: string; service: Service }>(`/api/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Bookings
  createBooking: (data: {
    service_id: string;
    booking_date: string;
    time_slot: string;
    service_address: string;
    locality: string;
    contact_number: string;
    problem_description: string;
    additional_instructions?: string;
  }) => request<{ message: string; booking: Booking }>('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getBookings: (params?: { status?: string; date?: string; serviceId?: string; search?: string; professionalId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'All') query.set('status', params.status);
    if (params?.date) query.set('date', params.date);
    if (params?.serviceId) query.set('serviceId', params.serviceId);
    if (params?.search) query.set('search', params.search);
    if (params?.professionalId) query.set('professionalId', params.professionalId);
    return request<{ bookings: Booking[] }>(`/api/bookings?${query.toString()}`);
  },
  getBooking: (id: string) => request<{ booking: Booking; history: BookingStatusHistory[]; review?: Review }>(`/api/bookings/${id}`),
  cancelBooking: (id: string, reason: string) => request<{ message: string; booking: Booking }>(`/api/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  rescheduleBooking: (id: string, new_date: string, new_slot: string) => request<{ message: string; booking: Booking }>(`/api/bookings/${id}/reschedule`, { method: 'POST', body: JSON.stringify({ new_date, new_slot }) }),
  updateBookingStatus: (id: string, status: string, reason?: string) => request<{ message: string; booking: Booking }>(`/api/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }),
  assignProfessional: (id: string, professional_id: string | null) => request<{ message: string; booking: Booking }>(`/api/bookings/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ professional_id }) }),

  // Professionals
  getProfessionals: (params?: { activeOnly?: boolean; category?: string; locality?: string }) => {
    const query = new URLSearchParams();
    if (params?.activeOnly !== undefined) query.set('activeOnly', String(params.activeOnly));
    if (params?.category) query.set('category', params.category);
    if (params?.locality) query.set('locality', params.locality);
    return request<{ professionals: Professional[] }>(`/api/professionals?${query.toString()}`);
  },
  createProfessional: (data: Partial<Professional>) => request<{ message: string; professional: Professional }>('/api/professionals', { method: 'POST', body: JSON.stringify(data) }),
  updateProfessional: (id: string, data: Partial<Professional>) => request<{ message: string; professional: Professional }>(`/api/professionals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getProfessionalSchedule: (id: string, month?: string) => request<{ schedule: Booking[] }>(`/api/professionals/${id}/schedule${month ? `?month=${month}` : ''}`),

  // Reviews
  getApprovedReviews: () => request<{ reviews: Review[]; stats: { total: number; average: number } }>('/api/reviews'),
  getAllReviewsAdmin: () => request<{ reviews: Review[] }>('/api/reviews/admin'),
  submitReview: (booking_id: string, rating: number, comment: string) => request<{ message: string; review: Review }>('/api/reviews', { method: 'POST', body: JSON.stringify({ booking_id, rating, comment }) }),
  moderateReview: (id: string, status: 'Approved' | 'Rejected') => request<{ message: string }>(`/api/reviews/${id}/moderate`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Enquiries
  submitEnquiry: (data: { name: string; email: string; phone: string; service_requested?: string; message: string }) => request<{ message: string; enquiryId: string }>('/api/enquiries', { method: 'POST', body: JSON.stringify(data) }),
  getEnquiries: (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'All') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    return request<{ enquiries: Enquiry[] }>(`/api/enquiries?${query.toString()}`);
  },
  updateEnquiry: (id: string, data: { status?: string; internal_notes?: string }) => request<{ message: string }>(`/api/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => request<{ notifications: NotificationItem[]; unreadCount: number }>('/api/notifications'),
  markNotificationRead: (id: string) => request<{ message: string }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<{ message: string }>('/api/notifications/mark-all-read', { method: 'POST' }),

  // Reports & Logs
  getReportSummary: (params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return request<ReportSummary>(`/api/reports/summary${qs ? `?${qs}` : ''}`);
  },
  getAuditLogs: (params?: { limit?: number; entityType?: string; action?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.entityType) query.set('entityType', params.entityType);
    if (params?.action) query.set('action', params.action);
    return request<{ logs: AuditLog[] }>(`/api/audit-logs?${query.toString()}`);
  },
  exportCsvUrl: (type: 'bookings' | 'services' | 'customers' | 'enquiries', params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams({ type });
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    return `/api/reports/export-csv?${query.toString()}`;
  },
};
