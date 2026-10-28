import React, { useState, useEffect } from 'react';
import { api, Review } from '../../services/api';
import { Check, X, RefreshCw, AlertCircle } from 'lucide-react';

export const AdminReviewsView: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await api.getAllReviewsAdmin();
      setReviews(res.reviews);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleModerate = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      await api.moderateReview(id, status);
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, moderation_status: status } : r))
      );
    } catch (err: unknown) {
      console.error(err);
    }
  };

  return (
    <div className="admin-view-container container">
      <div className="admin-view-header">
        <div>
          <h2>Customer Review Moderation</h2>
          <p>Verify feedback submitted by Pune customers for completed bookings</p>
        </div>
        <button type="button" className="btn-secondary" onClick={loadReviews}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="dashboard-loading">
            <RefreshCw size={28} className="spin" />
            <p>Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-state-box">
            <AlertCircle size={40} color="#94a3b8" />
            <p>No customer reviews recorded yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table full">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Rating</th>
                  <th>Customer Review</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.customer_name}</strong>
                      <br />
                      <small style={{ color: '#94a3b8' }}>ID: {r.booking_id}</small>
                    </td>
                    <td>{r.service_name}</td>
                    <td>
                      <div className="stars-display">
                        {'★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)}
                        <span style={{ marginLeft: '4px', color: '#64748b' }}>({r.rating})</span>
                      </div>
                    </td>
                    <td>
                      <p className="review-comment-text">"{r.comment}"</p>
                      <small style={{ color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString()}</small>
                    </td>
                    <td>
                      <span className={`status-pill ${r.moderation_status?.toLowerCase() || 'pending'}`}>
                        {r.moderation_status}
                      </span>
                    </td>
                    <td>
                      <div className="table-action-btns">
                        {r.moderation_status !== 'Approved' && (
                          <button
                            type="button"
                            className="action-btn confirm"
                            title="Approve Review"
                            onClick={() => handleModerate(r.id, 'Approved')}
                          >
                            <Check size={14} /> Approve
                          </button>
                        )}
                        {r.moderation_status !== 'Rejected' && (
                          <button
                            type="button"
                            className="action-btn cancel"
                            title="Reject Review"
                            onClick={() => handleModerate(r.id, 'Rejected')}
                          >
                            <X size={14} /> Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
