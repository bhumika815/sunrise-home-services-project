import React, { useState, useEffect } from 'react';
import { api, Enquiry } from '../../services/api';
import { Phone, Mail, RefreshCw, AlertCircle, Edit, Check } from 'lucide-react';

export const AdminEnquiriesView: React.FC = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [currentNotes, setCurrentNotes] = useState<string>('');

  const [actionError, setActionError] = useState<string | null>(null);

  const loadEnquiries = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await api.getEnquiries({ status: statusFilter !== 'All' ? statusFilter : undefined });
      setEnquiries(res.enquiries);
    } catch (err) {
      console.error('Failed to load enquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, [statusFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionError(null);
    try {
      await api.updateEnquiry(id, { status: newStatus });
      setEnquiries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: newStatus as Enquiry['status'] } : e))
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Status update failed.');
    }
  };

  const handleSaveNotes = async (id: string) => {
    setActionError(null);
    try {
      await api.updateEnquiry(id, { internal_notes: currentNotes });
      setEnquiries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, internal_notes: currentNotes } : e))
      );
      setEditingNotesId(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save notes.');
    }
  };

  return (
    <div className="admin-view-container container">
      {actionError && (
        <div className="policy-box warning flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600" />
            <span className="text-sm text-red-700">{actionError}</span>
          </div>
          <button type="button" className="text-xs text-red-600 font-bold" onClick={() => setActionError(null)}>
            Dismiss
          </button>
        </div>
      )}
      <div className="admin-view-header">
        <div>
          <h2>Contact Enquiries Desk</h2>
          <p>Customer contact messages, WhatsApp inquiries, and internal coordinator notes</p>
        </div>
        <div className="status-filters-group">
          {['All', 'New', 'In Progress', 'Resolved'].map((st) => (
            <button
              key={st}
              type="button"
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
          <button type="button" className="btn-secondary refresh-btn" onClick={loadEnquiries}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="dashboard-loading">
            <RefreshCw size={28} className="spin" />
            <p>Loading contact enquiries...</p>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="empty-state-box">
            <AlertCircle size={40} color="#94a3b8" />
            <p>No enquiries found for this filter.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table full">
              <thead>
                <tr>
                  <th>Enquirer</th>
                  <th>Service Requested</th>
                  <th>Customer Message</th>
                  <th>Status</th>
                  <th>Internal Coordinator Notes</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.name}</strong>
                      <div className="contact-cell">
                        <a href={`tel:${e.phone}`}><Phone size={12} /> {e.phone}</a>
                        <a href={`mailto:${e.email}`}><Mail size={12} /> {e.email}</a>
                      </div>
                      <small style={{ color: '#94a3b8' }}>{new Date(e.created_at).toLocaleString()}</small>
                    </td>
                    <td>
                      <span className="category-tag">{e.service_requested || 'General'}</span>
                    </td>
                    <td>
                      <p className="enquiry-message-text">"{e.message}"</p>
                    </td>
                    <td>
                      <select
                        className={`status-select ${e.status.toLowerCase().replace(' ', '-')}`}
                        value={e.status}
                        onChange={(evt) => handleStatusChange(e.id, evt.target.value)}
                      >
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                    <td>
                      {editingNotesId === e.id ? (
                        <div className="inline-notes-edit">
                          <input
                            type="text"
                            value={currentNotes}
                            onChange={(evt) => setCurrentNotes(evt.target.value)}
                            placeholder="Add internal note..."
                          />
                          <button
                            type="button"
                            className="notes-save-btn"
                            onClick={() => handleSaveNotes(e.id)}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="notes-cancel-btn"
                            onClick={() => setEditingNotesId(null)}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="notes-display-wrap">
                          <span className="notes-text">
                            {e.internal_notes || <em style={{ color: '#94a3b8' }}>No notes added</em>}
                          </span>
                          <button
                            type="button"
                            className="notes-edit-trigger"
                            title="Edit notes"
                            onClick={() => {
                              setEditingNotesId(e.id);
                              setCurrentNotes(e.internal_notes || '');
                            }}
                          >
                            <Edit size={13} />
                          </button>
                        </div>
                      )}
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
