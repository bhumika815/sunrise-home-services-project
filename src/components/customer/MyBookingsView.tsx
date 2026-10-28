import React, { useState, useEffect } from 'react';
import { api, Booking, BookingStatusHistory } from '../../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  Plus,
  RefreshCw,
  Star,
  XCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { RescheduleModal } from '../RescheduleModal';
import { CancelModal } from '../CancelModal';
import { ReviewModal } from '../ReviewModal';

interface MyBookingsViewProps {
  onOpenBookingModal: () => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({ onOpenBookingModal }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<{
    booking: Booking;
    history: BookingStatusHistory[];
  } | null>(null);

  // Modal states
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.getBookings();
      setBookings(res.bookings);
    } catch (err) {
      console.error('Failed to fetch customer bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleViewDetails = async (id: string) => {
    try {
      const res = await api.getBooking(id);
      setSelectedBookingForDetails({
        booking: res.booking,
        history: res.history,
      });
    } catch (err) {
      console.error('Error fetching details:', err);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'All') return true;
    return b.status === activeTab;
  });

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'Pending':
        return <span className="status-badge pending">⏳ Pending</span>;
      case 'Confirmed':
        return <span className="status-badge confirmed">✓ Confirmed</span>;
      case 'In Progress':
        return <span className="status-badge progress">⚙ In Progress</span>;
      case 'Completed':
        return <span className="status-badge completed">★ Completed</span>;
      case 'Cancelled':
        return <span className="status-badge cancelled">✕ Cancelled</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="customer-dashboard container">
      <div className="dashboard-header">
        <div>
          <h2>My Service Bookings</h2>
          <p>Track repair progress, assigned technicians, and schedule history</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={onOpenBookingModal}
        >
          <Plus size={18} /> Book New Service
        </button>
      </div>

      {/* Tabs */}
      <div className="status-tabs-row">
        {['All', 'Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map((tab) => {
          const count =
            tab === 'All'
              ? bookings.length
              : bookings.filter((b) => b.status === tab).length;
          return (
            <button
              key={tab}
              type="button"
              className={`status-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="dashboard-loading">
          <RefreshCw size={28} className="spin" />
          <p>Loading your appointments...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="empty-bookings-card">
          <AlertCircle size={48} color="#94a3b8" />
          <h3>No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} bookings found</h3>
          <p>Need plumbing, electrical, AC repair or painting in Pune?</p>
          <button type="button" className="btn-primary" onClick={onOpenBookingModal}>
            Schedule an Appointment
          </button>
        </div>
      ) : (
        <div className="bookings-grid">
          {filteredBookings.map((b) => (
            <div key={b.id} className="booking-item-card">
              <div className="item-card-header">
                <div>
                  <span className="booking-ref">{b.id}</span>
                  <h3>{b.service_name_snapshot}</h3>
                </div>
                {getStatusBadge(b.status)}
              </div>

              <div className="item-meta-grid">
                <div className="meta-item">
                  <Calendar size={16} />
                  <span>{b.booking_date}</span>
                </div>
                <div className="meta-item">
                  <Clock size={16} />
                  <span>{b.time_slot}</span>
                </div>
                <div className="meta-item">
                  <MapPin size={16} />
                  <span>{b.locality}, Pune</span>
                </div>
                <div className="meta-item price">
                  <span>Price: ₹{b.agreed_price_inr}</span>
                </div>
              </div>

              {b.assigned_professional_id && b.professional_name && (
                <div className="assigned-technician-box">
                  <div className="tech-avatar">
                    <User size={18} />
                  </div>
                  <div className="tech-info">
                    <span className="tech-label">Assigned Technician:</span>
                    <strong className="tech-name">{b.professional_name}</strong>
                    {b.professional_phone && (
                      <a href={`tel:${b.professional_phone}`} className="tech-phone">
                        <Phone size={14} /> {b.professional_phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {b.status === 'Cancelled' && b.cancellation_reason && (
                <div className="cancellation-info-box">
                  <span>Cancelled: {b.cancellation_reason}</span>
                </div>
              )}

              <div className="item-card-actions">
                <button
                  type="button"
                  className="card-action-btn secondary"
                  onClick={() => handleViewDetails(b.id)}
                >
                  <FileText size={15} /> Details
                </button>

                {(b.status === 'Pending' || b.status === 'Confirmed') && (
                  <>
                    <button
                      type="button"
                      className="card-action-btn reschedule"
                      onClick={() => setRescheduleBooking(b)}
                    >
                      <Clock size={15} /> Reschedule
                    </button>
                    <button
                      type="button"
                      className="card-action-btn cancel"
                      onClick={() => setCancelBooking(b)}
                    >
                      <XCircle size={15} /> Cancel
                    </button>
                  </>
                )}

                {b.status === 'Completed' && (
                  <button
                    type="button"
                    className="card-action-btn review"
                    onClick={() => setReviewBooking(b)}
                  >
                    <Star size={15} /> Rate &amp; Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Details & Status History Drawer/Modal */}
      {selectedBookingForDetails && (
        <div className="modal-overlay" onClick={() => setSelectedBookingForDetails(null)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="booking-ref">{selectedBookingForDetails.booking.id}</span>
                <h3>{selectedBookingForDetails.booking.service_name_snapshot}</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedBookingForDetails(null)}
              >
                ✕
              </button>
            </div>

            <div className="details-summary-card">
              <div className="detail-item">
                <span className="label">Status:</span>
                {getStatusBadge(selectedBookingForDetails.booking.status)}
              </div>
              <div className="detail-item">
                <span className="label">Scheduled:</span>
                <span>{selectedBookingForDetails.booking.booking_date} at {selectedBookingForDetails.booking.time_slot}</span>
              </div>
              <div className="detail-item">
                <span className="label">Address:</span>
                <span>{selectedBookingForDetails.booking.service_address}, {selectedBookingForDetails.booking.locality}, Pune</span>
              </div>
              <div className="detail-item">
                <span className="label">Problem Reported:</span>
                <p className="problem-text">{selectedBookingForDetails.booking.problem_description}</p>
              </div>
              {selectedBookingForDetails.booking.additional_instructions && (
                <div className="detail-item">
                  <span className="label">Special Instructions:</span>
                  <span>{selectedBookingForDetails.booking.additional_instructions}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="label">Agreed Rate:</span>
                <strong style={{ color: '#2563eb' }}>₹{selectedBookingForDetails.booking.agreed_price_inr}</strong>
              </div>
            </div>

            <div className="status-history-section">
              <h4>Audit &amp; Progress History</h4>
              <div className="history-timeline">
                {selectedBookingForDetails.history.map((h) => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <strong>Status transitioned to: {h.new_status}</strong>
                        <span className="timeline-date">
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p>{h.change_reason || 'Status updated by system/coordinator'}</p>
                      <small className="actor-tag">Updated by: {h.changed_by_name} ({h.changed_by_role})</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      <RescheduleModal
        booking={rescheduleBooking}
        isOpen={!!rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        onSuccess={() => {
          fetchBookings();
        }}
      />

      {/* Cancel Modal */}
      <CancelModal
        booking={cancelBooking}
        isOpen={!!cancelBooking}
        onClose={() => setCancelBooking(null)}
        onSuccess={() => {
          fetchBookings();
        }}
      />

      {/* Review Modal */}
      <ReviewModal
        booking={reviewBooking}
        isOpen={!!reviewBooking}
        onClose={() => setReviewBooking(null)}
        onSuccess={() => {
          fetchBookings();
        }}
      />
    </div>
  );
};
