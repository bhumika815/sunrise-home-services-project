import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Phone, MapPin, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { PUNE_LOCALITIES } from '../../constants';

export const MyProfileView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [locality, setLocality] = useState(user?.locality || 'Kothrud');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem('shs_token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          address,
          locality,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      await refreshUser();
      setFeedback({ type: 'success', message: 'Profile details updated successfully!' });
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Error updating profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="avatar-circle">
            <User size={36} color="#2563eb" />
          </div>
          <div>
            <h2>My Profile &amp; Address</h2>
            <p>Manage your contact details and default Pune service address</p>
          </div>
        </div>

        {feedback && (
          <div className={`form-feedback ${feedback.type}`} style={{ marginBottom: '20px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Full Name *</label>
            <div className="input-with-icon">
              <User size={18} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <div className="input-with-icon disabled">
              <Mail size={18} />
              <input type="email" disabled value={user.email} />
            </div>
            <small style={{ color: '#64748b' }}>Email cannot be changed directly for security reasons.</small>
          </div>

          <div className="form-group">
            <label>Contact Phone Number *</label>
            <div className="input-with-icon">
              <Phone size={18} />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Default Pune Locality *</label>
            <div className="input-with-icon">
              <MapPin size={18} />
              <select
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
              >
                {PUNE_LOCALITIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}, Pune
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Default Flat / Society Address</label>
            <input
              type="text"
              placeholder="e.g. Flat 304, Mayur Elegance, Paud Road"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', border: 'none', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Saving Changes...' : 'Save Profile Details'}
          </button>
        </form>
      </div>
    </div>
  );
};
