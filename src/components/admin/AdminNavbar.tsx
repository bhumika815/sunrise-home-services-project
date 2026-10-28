import React from 'react';
import { Page } from '../../types';
import {
  LayoutDashboard,
  CalendarDays,
  Wrench,
  Users,
  Star,
  MessageSquare,
  BarChart3,
  Shield,
  ClipboardList,
} from 'lucide-react';

interface AdminNavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({ currentPage, onNavigate }) => {
  const navItems = [
    { page: 'admin-dashboard' as Page, label: 'Overview', icon: LayoutDashboard },
    { page: 'admin-bookings' as Page, label: 'Bookings', icon: ClipboardList },
    { page: 'admin-calendar' as Page, label: 'Calendar', icon: CalendarDays },
    { page: 'admin-services' as Page, label: 'Services', icon: Wrench },
    { page: 'admin-professionals' as Page, label: 'Technicians', icon: Users },
    { page: 'admin-reviews' as Page, label: 'Reviews', icon: Star },
    { page: 'admin-enquiries' as Page, label: 'Enquiries', icon: MessageSquare },
    { page: 'admin-reports' as Page, label: 'Reports', icon: BarChart3 },
    { page: 'admin-audit' as Page, label: 'Audit Logs', icon: Shield },
  ];

  return (
    <div className="admin-subnav-bar">
      <div className="container admin-subnav-container">
        <div className="admin-badge-indicator">
          <Shield size={16} />
          <span>ADMIN PORTAL</span>
        </div>
        <div className="admin-nav-scroll">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                type="button"
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onNavigate(item.page)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
