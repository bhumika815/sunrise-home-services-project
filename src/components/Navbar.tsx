import React, { useState } from 'react';
import { Page } from '../types';
import { COMPANY_INFO } from '../data';
import { useAuth } from '../context/AuthContext';
import {
  Wrench,
  Bell,
  User,
  Shield,
  LogOut,
  Calendar,
  LogIn,
  PlusCircle,
} from 'lucide-react';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenBooking: () => void;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onOpenAuth,
  onOpenBooking,
  onOpenNotifications,
}) => {
  const { user, logout, unreadNotifications } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isAdminView = currentPage.startsWith('admin-');

  return (
    <header>
      <nav className="navbar">
        <a
          href="#home"
          className="logo"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
        >
          <Wrench size={26} color="#2563eb" />
          <span>{COMPANY_INFO.name}</span>
        </a>

        {/* Public Navigation Links */}
        <ul className="nav-links">
          <li>
            <button
              type="button"
              className={currentPage === 'home' ? 'active' : ''}
              onClick={() => onNavigate('home')}
            >
              Home
            </button>
          </li>
          <li>
            <button
              type="button"
              className={currentPage === 'services' ? 'active' : ''}
              onClick={() => onNavigate('services')}
            >
              Services
            </button>
          </li>
          <li>
            <button
              type="button"
              className={currentPage === 'contact' ? 'active' : ''}
              onClick={() => onNavigate('contact')}
            >
              Contact
            </button>
          </li>

          {user && user.role === 'customer' && (
            <li>
              <button
                type="button"
                className={currentPage === 'my-bookings' ? 'active' : ''}
                onClick={() => onNavigate('my-bookings')}
              >
                My Bookings
              </button>
            </li>
          )}

          {user && user.role === 'admin' && (
            <li>
              <button
                type="button"
                className={`admin-highlight-nav ${isAdminView ? 'active' : ''}`}
                onClick={() => onNavigate('admin-dashboard')}
              >
                <Shield size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Admin Portal
              </button>
            </li>
          )}
        </ul>

        {/* Action Controls */}
        <div className="navbar-right-controls">
          <button
            type="button"
            className="book-now-header-btn"
            onClick={onOpenBooking}
          >
            <PlusCircle size={16} /> Book Service
          </button>

          {user ? (
            <div className="auth-user-menu">
              <button
                type="button"
                className="notif-bell-btn"
                onClick={onOpenNotifications}
                title="Notifications"
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="notif-count-badge">{unreadNotifications}</span>
                )}
              </button>

              <div className="user-dropdown-container">
                <button
                  type="button"
                  className="user-profile-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <div className="avatar-chip">
                    {user.role === 'admin' ? (
                      <Shield size={16} color="#7c3aed" />
                    ) : (
                      <User size={16} color="#2563eb" />
                    )}
                  </div>
                  <span className="user-name-label">{user.full_name.split(' ')[0]}</span>
                </button>

                {userDropdownOpen && (
                  <div className="user-dropdown-menu" onClick={() => setUserDropdownOpen(false)}>
                    <div className="dropdown-user-header">
                      <strong>{user.full_name}</strong>
                      <small>{user.email}</small>
                      <span className={`role-tag ${user.role}`}>{user.role.toUpperCase()}</span>
                    </div>

                    {user.role === 'customer' ? (
                      <>
                        <button type="button" onClick={() => onNavigate('my-bookings')}>
                          <Calendar size={15} /> My Bookings
                        </button>
                        <button type="button" onClick={() => onNavigate('my-profile')}>
                          <User size={15} /> Profile &amp; Address
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => onNavigate('admin-dashboard')}>
                          <Shield size={15} /> Admin Dashboard
                        </button>
                        <button type="button" onClick={() => onNavigate('admin-bookings')}>
                          <Calendar size={15} /> Dispatch Bookings
                        </button>
                      </>
                    )}

                    <div className="dropdown-divider" />
                    <button type="button" className="logout-btn" onClick={logout}>
                      <LogOut size={15} /> Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="login-trigger-btn"
              onClick={() => onOpenAuth('login')}
            >
              <LogIn size={16} /> Log In
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};
