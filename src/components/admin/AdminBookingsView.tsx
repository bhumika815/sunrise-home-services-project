import React, { useState, useEffect } from 'react';
import { api, Booking, Professional, BookingStatusHistory } from '../../services/api';
import {
  Search,
  Filter,
  UserCheck,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  IndianRupee,
  RefreshCw,
  X,
  Play,
} from 'lucide-react';

export const AdminBookingsView: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Modals
  const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
  const [selectedProfId, setSelectedProfId] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [detailsBooking, setDetailsBooking] = useState<{
    booking: Booking;
    history: BookingStatusHistory[];
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        api.getBookings({ status: statusFilter !== 'All' ? statusFilter : undefined, search }),
        api.getProfessionals({ activeOnly: true }),
      ]);
      setBookings(bRes.bookings);
      setProfessionals(pRes.professionals);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleStatusTransition = async (id: string, newStatus: string) => {
    try {
      await api.updateBookingStatus(id, newStatus, `Transitioned to ${newStatus} by admin`);
      loadData();
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningBooking) return;
    setAssignError(null);

    try {
      await api.assignProfessional(assigningBooking.id, selectedProfId || null);
      setAssigningBooking(null);
      setSelectedProfId('');
      loadData();
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : 'Assignment failed.');
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBooking || !cancelReason.trim()) return;

    try {
      await api.cancelBooking(cancellingBooking.id, cancelReason);
      setCancellingBooking(null);
      setCancelReason('');
      loadData();
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'Cancellation failed.');
    }
  };

  const handleViewDetails = async (id: string) => {
    try {
      const res = await api.getBooking(id);
      setDetailsBooking({ booking: res.booking, history: res.history });
    } catch (err) {
      console.error('Error fetching details:', err);
    }
  };

  return (
    <div className="admin-view-container container">
      <div className="admin-view-header">
        <div>
          <h2>Booking Management &amp; Dispatch</h2>
          <p>Assign field technicians, manage status transitions, and inspect history</p>
        </div>
        <button type="button" className="btn-secondary refresh-btn" onClick={loadData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-controls-card">
        <form onSubmit={handleSearchSubmit} className="admin-search-form">
          <div className="search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by ID (SHS-...), customer name, service or locality..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary search-btn">
            Filter
          </button>
        </form>

        <div className="admin-status-filters">
          <Filter size={16} />
          <span>Status:</span>
          {['All', 'Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="admin-table-card">
        {loading ? (
          <div className="dashboard-loading">
            <RefreshCw size={28} className="spin" />
            <p>Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="empty-state-box">
            <AlertCircle size={40} color="#94a3b8" />
            <p>No bookings match the selected filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table full">
              <thead>
                <tr>
                  <th>Booking Reference</th>
                  <th>Customer</th>
                  <th>Service &amp; Price</th>
                  <th>Schedule</th>
                  <th>Locality</th>
                  <th>Status</th>
                  <th>Assigned Technician</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <button
                        type="button"
                        className="text-booking-link"
                        onClick={() => handleViewDetails(b.id)}
                      >
                        {b.id}
                      </button>
                      <br />
                      <small style={{ color: '#94a3b8' }}>
                        {new Date(b.created_at).toLocaleDateString()}
                      </small>
                    </td>
                    <td>
                      <strong>{b.customer_name}</strong>
                      <br />
                      <small style={{ color: '#64748b' }}>{b.contact_number}</small>
                    </td>
                    <td>
                      <span>{b.service_name_snapshot}</span>
                      <br />
                      <strong style={{ color: '#2563eb' }}>
                        <IndianRupee size={12} style={{ display: 'inline' }} />
                        {b.agreed_price_inr}
                      </strong>
                    </td>
                    <td>
                      <strong>{b.booking_date}</strong>
                      <br />
                      <small style={{ color: '#64748b' }}>{b.time_slot}</small>
                    </td>
                    <td>{b.locality}</td>
                    <td>
                      <span className={`status-pill ${b.status.toLowerCase().replace(' ', '-')}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      {b.professional_name ? (
                        <div className="assigned-prof-tag">
                          <span>{b.professional_name}</span>
                          <button
                            type="button"
                            className="reassign-btn"
                            title="Change technician"
                            onClick={() => {
                              setAssigningBooking(b);
                              setSelectedProfId(b.assigned_professional_id || '');
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="assign-trigger-btn"
                          onClick={() => {
                            setAssigningBooking(b);
                            setSelectedProfId('');
                          }}
                        >
                          <UserCheck size={14} /> Assign Tech
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="table-action-btns">
                        {b.status === 'Pending' && (
                          <button
                            type="button"
                            className="action-btn confirm"
                            title="Confirm Booking"
                            onClick={() => handleStatusTransition(b.id, 'Confirmed')}
                          >
                            <CheckCircle size={14} /> Confirm
                          </button>
                        )}

                        {b.status === 'Confirmed' && (
                          <button
                            type="button"
                            className="action-btn start"
                            title="Start Service"
                            onClick={() => handleStatusTransition(b.id, 'In Progress')}
                          >
                            <Play size={14} /> Start
                          </button>
                        )}

                        {b.status === 'In Progress' && (
                          <button
                            type="button"
                            className="action-btn complete"
                            title="Complete Job"
                            onClick={() => handleStatusTransition(b.id, 'Completed')}
                          >
                            <CheckCircle size={14} /> Complete
                          </button>
                        )}

                        {b.status !== 'Completed' && b.status !== 'Cancelled' && (
                          <button
                            type="button"
                            className="action-btn cancel"
                            title="Cancel Booking"
                            onClick={() => {
                              setCancellingBooking(b);
                              setCancelReason('');
                            }}
                          >
                            <XCircle size={14} />
                          </button>
                        )}

                        <button
                          type="button"
                          className="action-btn details"
                          title="View Audit Details"
                          onClick={() => handleViewDetails(b.id)}
                        >
                          <FileText size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Technician Assignment Modal */}
      {assigningBooking && (
        <div className="modal-overlay" onClick={() => setAssigningBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Technician to {assigningBooking.id}</h3>
              <p>
                Service: <strong>{assigningBooking.service_name_snapshot}</strong> | Locality:{' '}
                <strong>{assigningBooking.locality}</strong> | Schedule:{' '}
                <strong>{assigningBooking.booking_date} ({assigningBooking.time_slot})</strong>
              </p>
            </div>

            {assignError && (
              <div className="auth-error-banner">
                <AlertCircle size={18} />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignSubmit}>
              <div className="form-group">
                <label>Select Certified Field Technician *</label>
                <select
                  value={selectedProfId}
                  onChange={(e) => setSelectedProfId(e.target.value)}
                  required
                >
                  <option value="">-- Choose available technician --</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.phone}) — Skills: {p.categories.join(', ')} — Areas:{' '}
                      {p.service_areas.join(', ')}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#64748b', display: 'block', marginTop: '6px' }}>
                  * The system automatically verifies that the technician has the required skill and has no scheduling collision on {assigningBooking.booking_date} ({assigningBooking.time_slot}).
                </small>
              </div>

              <div className="modal-buttons-split">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAssigningBooking(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Cancel Modal */}
      {cancellingBooking && (
        <div className="modal-overlay" onClick={() => setCancellingBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header warning">
              <h3>Admin Cancellation</h3>
              <p>
                Cancel booking <strong>{cancellingBooking.id}</strong> ({cancellingBooking.service_name_snapshot})
              </p>
            </div>

            <form onSubmit={handleCancelSubmit}>
              {cancelError && (
                <div className="policy-box warning flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-red-600" />
                  <span className="text-sm text-red-700">{cancelError}</span>
                </div>
              )}
              <div className="form-group">
                <label>Reason for Cancellation (Logged in Audit Trail) *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Customer requested telephone cancellation, duplicate order, technician emergency..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div className="modal-buttons-split">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCancellingBooking(null)}
                >
                  Close
                </button>
                <button type="submit" className="btn-danger">
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit & Details Modal */}
      {detailsBooking && (
        <div className="modal-overlay" onClick={() => setDetailsBooking(null)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="booking-ref">{detailsBooking.booking.id}</span>
                <h3>{detailsBooking.booking.service_name_snapshot}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setDetailsBooking(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="details-summary-card">
              <div className="detail-item">
                <span className="label">Customer:</span>
                <strong>{detailsBooking.booking.customer_name} ({detailsBooking.booking.contact_number})</strong>
              </div>
              <div className="detail-item">
                <span className="label">Address:</span>
                <span>{detailsBooking.booking.service_address}, {detailsBooking.booking.locality}, Pune</span>
              </div>
              <div className="detail-item">
                <span className="label">Schedule:</span>
                <span>{detailsBooking.booking.booking_date} ({detailsBooking.booking.time_slot})</span>
              </div>
              <div className="detail-item">
                <span className="label">Status:</span>
                <span className={`status-pill ${detailsBooking.booking.status.toLowerCase().replace(' ', '-')}`}>
                  {detailsBooking.booking.status}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Price:</span>
                <strong style={{ color: '#2563eb' }}>₹{detailsBooking.booking.agreed_price_inr}</strong>
              </div>
              <div className="detail-item">
                <span className="label">Problem Description:</span>
                <p className="problem-text">{detailsBooking.booking.problem_description}</p>
              </div>
            </div>

            <div className="status-history-section">
              <h4>Booking Lifecycle Audit History</h4>
              <div className="history-timeline">
                {detailsBooking.history.map((h) => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <strong>New Status: {h.new_status}</strong>
                        <span className="timeline-date">{new Date(h.created_at).toLocaleString()}</span>
                      </div>
                      <p>{h.change_reason || 'Status update'}</p>
                      <small className="actor-tag">Actor: {h.changed_by_name} ({h.changed_by_role})</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
