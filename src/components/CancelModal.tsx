import React, { useState } from 'react';
import { api, Booking } from '../services/api';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';

interface CancelModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for cancelling this booking.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.cancelBooking(booking.id, reason);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cancel-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="modal-header warning">
          <AlertTriangle size={32} color="#dc2626" />
          <h3>Cancel Booking</h3>
          <p>
            Are you sure you want to cancel booking <strong>{booking.id}</strong>?
          </p>
        </div>

        <div className="policy-box">
          <strong>Cancellation Policy:</strong>
          <p>
            Cancellations are 100% free of charge. If your schedule has changed, you can also reschedule instead of cancelling.
          </p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Reason for Cancellation *</label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Issue resolved on own, travelling out of town, booked by mistake..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="modal-buttons-split">
            <button
              type="button"
              className="btn-secondary"
              style={{ color: '#475569', borderColor: '#cbd5e1' }}
              onClick={onClose}
              disabled={loading}
            >
              Keep Booking
            </button>
            <button
              type="submit"
              className="btn-danger"
              disabled={loading}
            >
              {loading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
