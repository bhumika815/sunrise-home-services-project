import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, UserCheck, ShieldCheck, Mail, Lock, User, Phone, MapPin, AlertCircle } from 'lucide-react';
import { PUNE_LOCALITIES } from '../constants';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const { login, register, loginDemo } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('Kothrud');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          full_name: fullName,
          email,
          phone,
          password,
          address,
          locality,
        });
      }
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'customer' | 'admin') => {
    setError(null);
    setLoading(true);
    try {
      await loginDemo(role);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="auth-header">
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>
            {mode === 'login'
              ? 'Log in to track your service bookings & history'
              : 'Sign up for fast, reliable home maintenance across Pune'}
          </p>
        </div>

        {/* Demo Login Quick Switch for Evaluators */}
        <div className="demo-credentials-box">
          <div className="demo-title">
            <span>⚡ Quick Demo Login (Academic Evaluation)</span>
          </div>
          <div className="demo-btn-group">
            <button
              type="button"
              className="demo-btn customer"
              onClick={() => handleDemoLogin('customer')}
              disabled={loading}
            >
              <UserCheck size={16} />
              <span>Customer Demo (Pooja)</span>
            </button>
            <button
              type="button"
              className="demo-btn admin"
              onClick={() => handleDemoLogin('admin')}
              disabled={loading}
            >
              <ShieldCheck size={16} />
              <span>Admin Demo (Operations)</span>
            </button>
          </div>
        </div>

        <div className="auth-tab-switch">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => {
              setMode('login');
              setError(null);
            }}
          >
            Log In
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => {
              setMode('register');
              setError(null);
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label>Full Name *</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pooja Joshi"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <div className="input-with-icon">
                  <Phone size={18} />
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
                <label>Locality in Pune *</label>
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
                <label>Flat / House Address</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 304, Mayur Elegance"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email Address *</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password *</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
