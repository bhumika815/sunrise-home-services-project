import React, { useState, useEffect } from 'react';
import { api, AuditLog } from '../../services/api';
import { RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { AuditMetadataRenderer } from './AuditMetadataRenderer';

export const AdminAuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        limit: 100,
        entityType: entityFilter || undefined,
      });
      setLogs(res.logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [entityFilter]);

  return (
    <div className="admin-view-container container">
      <div className="admin-view-header">
        <div>
          <h2>System Security &amp; Operational Audit Trail</h2>
          <p>Immutable log of administrative status changes, technician assignments, and service catalogue edits</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            className="filter-select"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">All Entities</option>
            <option value="booking">Bookings</option>
            <option value="service">Services</option>
            <option value="professional">Technicians</option>
            <option value="review">Reviews</option>
            <option value="enquiry">Enquiries</option>
            <option value="user">User &amp; Auth</option>
          </select>
          <button type="button" className="btn-secondary refresh-btn" onClick={loadAuditLogs}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="dashboard-loading">
            <RefreshCw size={28} className="spin" />
            <p>Loading audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state-box">
            <AlertCircle size={40} color="#94a3b8" />
            <p>No audit events match the selected criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table full">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Event Metadata</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <span className="timestamp-text">
                        <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {new Date(l.created_at).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <strong>{l.actor_name}</strong>
                      <br />
                      <span className={`actor-role-pill ${l.actor_role}`}>
                        {l.actor_role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className="action-code">{l.action}</span>
                    </td>
                    <td>
                      <span className="entity-badge">{l.entity_type}</span>
                      <br />
                      <small style={{ color: '#64748b' }}>{l.entity_id}</small>
                    </td>
                    <td>
                      <AuditMetadataRenderer metadata={l.metadata} />
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
