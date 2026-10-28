import React, { useState, useEffect } from 'react';
import { api, Professional } from '../../services/api';
import { Plus, Edit2, CheckCircle2, XCircle, RefreshCw, X, AlertCircle, Phone, Mail } from 'lucide-react';
import { VALID_CATEGORIES, PUNE_LOCALITIES } from '../../constants';

export const AdminProfessionalsView: React.FC = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProf, setEditingProf] = useState<Professional | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Plumbing']);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['Kothrud']);
  const [isActive, setIsActive] = useState(true);

  const loadProfessionals = async () => {
    setLoading(true);
    try {
      const res = await api.getProfessionals({ activeOnly: false });
      setProfessionals(res.professionals);
    } catch (err) {
      console.error('Failed to load professionals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfessionals();
  }, []);

  const openAddModal = () => {
    setIsAdding(true);
    setEditingProf(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setSelectedCategories(['Plumbing']);
    setSelectedAreas(['Kothrud']);
    setIsActive(true);
    setFormError(null);
  };

  const openEditModal = (p: Professional) => {
    setEditingProf(p);
    setIsAdding(false);
    setFullName(p.full_name);
    setEmail(p.email);
    setPhone(p.phone);
    setSelectedCategories(p.categories || []);
    setSelectedAreas(p.service_areas || []);
    setIsActive(p.is_active === 1);
    setFormError(null);
  };

  const [actionError, setActionError] = useState<string | null>(null);

  const handleToggleActive = async (p: Professional) => {
    setActionError(null);
    try {
      await api.updateProfessional(p.id, { is_active: p.is_active === 1 ? 0 : 1 });
      loadProfessionals();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((c) => c !== cat));
      }
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const toggleArea = (area: string) => {
    if (selectedAreas.includes(area)) {
      if (selectedAreas.length > 1) {
        setSelectedAreas(selectedAreas.filter((a) => a !== area));
      }
    } else {
      setSelectedAreas([...selectedAreas, area]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      if (isAdding) {
        await api.createProfessional({
          full_name: fullName,
          email,
          phone,
          categories: selectedCategories,
          service_areas: selectedAreas,
        });
      } else if (editingProf) {
        await api.updateProfessional(editingProf.id, {
          full_name: fullName,
          phone,
          categories: selectedCategories,
          service_areas: selectedAreas,
          is_active: isActive ? 1 : 0,
        });
      }

      setIsAdding(false);
      setEditingProf(null);
      loadProfessionals();
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
          <h2>Certified Field Technicians</h2>
          <p>Manage technician roster, verified category skills, and Pune service territories</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn-secondary" onClick={loadProfessionals}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add Technician
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="dashboard-loading">
            <RefreshCw size={28} className="spin" />
            <p>Loading technicians...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table full">
              <thead>
                <tr>
                  <th>Technician Name</th>
                  <th>Contact Info</th>
                  <th>Skill Categories</th>
                  <th>Service Localities</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {professionals.map((p) => (
                  <tr key={p.id} className={p.is_active === 0 ? 'row-inactive' : ''}>
                    <td>
                      <strong>{p.full_name}</strong>
                      <br />
                      <small style={{ color: '#94a3b8' }}>ID: {p.id}</small>
                    </td>
                    <td>
                      <div className="contact-cell">
                        <span><Phone size={13} /> {p.phone}</span>
                        <span><Mail size={13} /> {p.email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="skill-tags">
                        {p.categories.map((c) => (
                          <span key={c} className="skill-tag">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="area-tags">
                        {p.service_areas.slice(0, 3).map((a) => (
                          <span key={a} className="area-tag">
                            {a}
                          </span>
                        ))}
                        {p.service_areas.length > 3 && (
                          <small>+{p.service_areas.length - 3} more</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`status-toggle-btn ${p.is_active === 1 ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleActive(p)}
                      >
                        {p.is_active === 1 ? (
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
                        onClick={() => openEditModal(p)}
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

      {/* Add / Edit Professional Modal */}
      {(isAdding || editingProf) && (
        <div className="modal-overlay" onClick={() => { setIsAdding(false); setEditingProf(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isAdding ? 'Register New Field Professional' : `Edit ${editingProf?.full_name}`}</h3>
              <button
                className="modal-close-btn"
                onClick={() => { setIsAdding(false); setEditingProf(null); }}
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
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Santosh Kulkarni"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!isAdding}
                    placeholder="technician@sunrisehomeservices.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98220 12345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Verified Skill Categories *</label>
                <div className="tag-selector-grid">
                  {VALID_CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      className={`tag-btn ${selectedCategories.includes(cat) ? 'selected' : ''}`}
                      onClick={() => toggleCategory(cat)}
                    >
                      {selectedCategories.includes(cat) ? '✓ ' : '+ '}
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Assigned Pune Service Localities *</label>
                <div className="tag-selector-grid scrollable">
                  {['All Pune', ...PUNE_LOCALITIES].map((area) => (
                    <button
                      type="button"
                      key={area}
                      className={`tag-btn ${selectedAreas.includes(area) ? 'selected' : ''}`}
                      onClick={() => toggleArea(area)}
                    >
                      {selectedAreas.includes(area) ? '✓ ' : '+ '}
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              {!isAdding && (
                <div className="checkbox-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span>Active and Available for Automatic Dispatch</span>
                  </label>
                </div>
              )}

              <div className="modal-buttons-split">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setIsAdding(false); setEditingProf(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {isAdding ? 'Register Professional' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
