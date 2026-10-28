import React, { useEffect, useState } from 'react';
import { api, ReportSummary, Booking } from '../../services/api';
import { Page } from '../../types';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  IndianRupee,
  Users,
  MessageSquare,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardViewProps {
  onNavigate: (page: Page) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, bookRes] = await Promise.all([
        api.getReportSummary(),
        api.getBookings(),
      ]);
      setSummary(sumRes);
      setRecentBookings(bookRes.bookings.slice(0, 6));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !summary) {
    return (
      <div className="container dashboard-loading">
        <RefreshCw size={28} className="spin" />
        <p>Loading Administrator Dashboard Metrics...</p>
      </div>
    );
  }

  const { metrics, categoryStats } = summary;

  return (
    <div className="admin-view-container container">
      <div className="admin-view-header">
        <div>
          <h2>Operations Overview</h2>
          <p>Real-time booking dispatch, technician workload, and revenue performance</p>
        </div>
        <button type="button" className="btn-secondary refresh-btn" onClick={loadData}>
          <RefreshCw size={16} /> Refresh Metrics
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-icon">
            <ClipboardList size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Total Bookings</span>
            <strong className="kpi-value">{metrics.totalBookings}</strong>
            <small>Across all Pune areas</small>
          </div>
        </div>

        <div className="kpi-card yellow">
          <div className="kpi-icon">
            <Clock size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Pending Dispatch</span>
            <strong className="kpi-value">{metrics.statusCounts.Pending || 0}</strong>
            <small>Requires coordinator action</small>
          </div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon">
            <CheckCircle size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Jobs Completed</span>
            <strong className="kpi-value">{metrics.statusCounts.Completed || 0}</strong>
            <small>Successfully delivered</small>
          </div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-icon">
            <IndianRupee size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Completed Value</span>
            <strong className="kpi-value">₹{metrics.completedValueInr.toLocaleString()}</strong>
            <small>Est. Pipeline: ₹{metrics.estimatedValueInr.toLocaleString()}</small>
          </div>
        </div>

        <div className="kpi-card teal">
          <div className="kpi-icon">
            <Users size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Active Technicians</span>
            <strong className="kpi-value">{metrics.activeProfessionals}</strong>
            <small>{metrics.totalCustomers} registered customers</small>
          </div>
        </div>

        <div className="kpi-card orange">
          <div className="kpi-icon">
            <MessageSquare size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">New Enquiries</span>
            <strong className="kpi-value">{metrics.pendingEnquiries}</strong>
            <small>Awaiting response</small>
          </div>
        </div>
      </div>

      {/* 2-Column Split: Category Distribution & Recent Bookings */}
      <div className="dashboard-columns-split">
        <div className="admin-card">
          <div className="card-header-row">
            <h3>Bookings by Category</h3>
            <button
              type="button"
              className="text-link"
              onClick={() => onNavigate('admin-services')}
            >
              Manage Catalog
            </button>
          </div>

          <div className="category-bars-list">
            {categoryStats.map((cat) => {
              const percentage =
                metrics.totalBookings > 0
                  ? Math.round((cat.booking_count / metrics.totalBookings) * 100)
                  : 0;
              return (
                <div key={cat.category} className="cat-bar-item">
                  <div className="cat-bar-labels">
                    <span className="cat-name">{cat.category}</span>
                    <span className="cat-count">
                      {cat.booking_count} jobs (₹{cat.total_value?.toLocaleString() || 0})
                    </span>
                  </div>
                  <div className="cat-bar-track">
                    <div
                      className="cat-bar-fill"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="admin-card">
          <div className="card-header-row">
            <h3>Recent Booking Requests</h3>
            <button
              type="button"
              className="text-link"
              onClick={() => onNavigate('admin-bookings')}
            >
              View All Bookings <ArrowRight size={14} style={{ display: 'inline' }} />
            </button>
          </div>

          <div className="recent-bookings-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span className="table-booking-id">{b.id}</span>
                    </td>
                    <td>{b.customer_name}</td>
                    <td>{b.service_name_snapshot}</td>
                    <td>{b.booking_date}</td>
                    <td>
                      <span className={`status-pill ${b.status.toLowerCase().replace(' ', '-')}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
