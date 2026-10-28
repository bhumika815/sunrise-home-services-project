import React, { useState } from 'react';
import { api, Booking } from '../services/api';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { VALID_TIME_SLOTS } from '../constants';

interface RescheduleModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [newDate, setNewDate] = useState<string>('');
  const [newSlot, setNewSlot] = useState<string>(VALID_TIME_SLOTS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  const maxDateStr = maxDate.toISOString().slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newSlot) {
      setError('Please choose a valid new date and slot.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.rescheduleBooking(booking.id, newDate, newSlot);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content reschedule-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="modal-header">
          <h3>Reschedule Appointment</h3>
          <p>
            Booking: <strong>{booking.id}</strong> ({booking.service_name_snapshot})
          </p>
        </div>

        <div className="current-slot-info">
          <span>Current schedule:</span>
          <strong>{booking.booking_date} at {booking.time_slot}</strong>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <Calendar size={16} /> Choose New Date *
            </label>
            <input
              type="date"
              required
              min={todayStr}
              max={maxDateStr}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>
              <Clock size={16} /> Choose New Time Slot *
            </label>
            <select
              value={newSlot}
              onChange={(e) => setNewSlot(e.target.value)}
              required
            >
              {VALID_TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', border: 'none', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Validating Availability...' : 'Confirm Reschedule'}
          </button>
        </form>
      </div>
    </div>
  );
};
