import React, { useState, useEffect } from 'react';
import { api, Service } from '../../services/api';
import { Plus, Edit2, CheckCircle2, XCircle, RefreshCw, X, AlertCircle } from 'lucide-react';
import { VALID_CATEGORIES } from '../../constants';

export const AdminServicesView: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Service['category']>('Plumbing');
  const [description, setDescription] = useState('');
  const [priceInr, setPriceInr] = useState<number>(499);
  const [duration, setDuration] = useState<number>(60);
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await api.getServices({ includeInactive: true });
      setServices(res.services);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openAddModal = () => {
    setIsAdding(true);
    setEditingService(null);
    setName('');
    setCategory('Plumbing');
    setDescription('');
    setPriceInr(499);
    setDuration(60);
    setImageUrl('');
    setIsActive(true);
    setFormError(null);
  };

  const openEditModal = (s: Service) => {
    setEditingService(s);
    setIsAdding(false);
    setName(s.name);
    setCategory(s.category);
    setDescription(s.description);
    setPriceInr(s.price_inr);
    setDuration(s.estimated_duration_min);
    setImageUrl(s.image_url || '');
    setIsActive(s.is_active === 1);
    setFormError(null);
  };

  const [actionError, setActionError] = useState<string | null>(null);

  const handleToggleActive = async (s: Service) => {
    setActionError(null);
    try {
      await api.updateService(s.id, { is_active: s.is_active === 1 ? 0 : 1 });
      loadServices();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      if (isAdding) {
        await api.createService({
          name,
          category,
          description,
          price_inr: Number(priceInr),
          estimated_duration_min: Number(duration),
          image_url: imageUrl || undefined,
        });
      } else if (editingService) {
        await api.updateService(editingService.id, {
          name,
          category,
          description,
          price_inr: Number(priceInr),
          estimated_duration_min: Number(duration),
          image_url: imageUrl || undefined,
          is_active: isActive ? 1 : 0,
        });
      }

      setIsAdding(false);
      setEditingService(null);
      loadServices();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Save failed.');
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
          <h2>Services Catalog Management</h2>
          <p>Define service offerings, official Pune pricing (INR), and availability</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn-secondary" onClick={loadServices}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add New Service
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="dashboard-loading">
            <RefreshCw size={28} className="spin" />
            <p>Loading catalog...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table full">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Category</th>
                  <th>Price (INR)</th>
                  <th>Est. Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className={s.is_active === 0 ? 'row-inactive' : ''}>
                    <td>
                      <strong>{s.name}</strong>
                      <p className="table-subtext">{s.description.slice(0, 75)}...</p>
                    </td>
                    <td>
                      <span className="category-tag">{s.category}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#2563eb' }}>₹{s.price_inr}</strong>
                    </td>
                    <td>{s.estimated_duration_min} mins</td>
                    <td>
                      <button
                        type="button"
                        className={`status-toggle-btn ${s.is_active === 1 ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleActive(s)}
                        title="Click to toggle active status"
                      >
                        {s.is_active === 1 ? (
                          <>
                            <CheckCircle2 size={14} /> Active
                          </>
                        ) : (
                          <>
                            <XCircle size={14} /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="card-action-btn secondary"
                        onClick={() => openEditModal(s)}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Service Modal */}
      {(isAdding || editingService) && (
        <div className="modal-overlay" onClick={() => { setIsAdding(false); setEditingService(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isAdding ? 'Add New Home Service' : `Edit ${editingService?.name}`}</h3>
              <button
                className="modal-close-btn"
                onClick={() => { setIsAdding(false); setEditingService(null); }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="auth-error-banner">
                <AlertCircle size={18} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Copper Pipe Brazing & Valve Replacement"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Service['category'])}
                  >
                    {VALID_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Price in INR (₹) *</label>
                  <input
                    type="number"
                    required
                    min={50}
                    value={priceInr}
                    onChange={(e) => setPriceInr(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Est. Duration (Minutes) *</label>
                  <input
                    type="number"
                    required
                    min={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label>Cover Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Service Description &amp; Scope *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Clear description of what this service covers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {!isAdding && (
                <div className="checkbox-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span>Active in Public Catalogue (Accepting new bookings)</span>
                  </label>
                </div>
              )}

              <div className="modal-buttons-split">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setIsAdding(false); setEditingService(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {isAdding ? 'Create Service' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
