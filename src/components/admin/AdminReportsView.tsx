import React, { useState, useEffect } from 'react';
import { api, ReportSummary } from '../../services/api';
import {
  Download,
  RefreshCw,
  IndianRupee,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Receipt,
  Users,
  Wrench,
  MessageSquare,
  ClipboardList,
  AlertCircle,
  XCircle,
} from 'lucide-react';

export const AdminReportsView: React.FC = () => {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportStatus, setExportStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  const loadReports = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const res = await api.getReportSummary({
        startDate: start || undefined,
        endDate: end || undefined,
      });
      setSummary(res);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if ((startDate && !endDate) || (!startDate && endDate)) {
      setExportStatus({
        type: 'error',
        message: 'Please provide both Start Date and End Date to filter by date range.',
      });
      return;
    }
    setExportStatus({ type: 'idle' });
    loadReports(startDate, endDate);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setExportStatus({ type: 'idle' });
    loadReports('', '');
  };

  const handleDownloadCsv = async (type: 'bookings' | 'services' | 'customers' | 'enquiries') => {
    const token = localStorage.getItem('shs_token');
    const queryParams: { startDate?: string; endDate?: string } = {};
    if (startDate && endDate) {
      queryParams.startDate = startDate;
      queryParams.endDate = endDate;
    }

    const exportUrl = api.exportCsvUrl(type, queryParams);
    const dateLabel = startDate && endDate ? `${startDate}_to_${endDate}` : new Date().toISOString().slice(0, 10);
    const expectedFilename = `sunrise-${type}-${dateLabel}.csv`;

    setExportStatus({
      type: 'loading',
      message: `Generating ${type} CSV export...`,
    });

    try {
      const res = await fetch(exportUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = expectedFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setExportStatus({
        type: 'success',
        message: `Successfully downloaded ${expectedFilename}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown export error';
      setExportStatus({
        type: 'error',
        message: `Download failed: ${msg}`,
      });
    }
  };

  if (loading && !summary) {
    return (
      <div className="container dashboard-loading">
        <RefreshCw size={28} className="spin text-blue-600" />
        <p>Loading business analytics...</p>
      </div>
    );
  }

  const metrics = summary?.metrics;
  const technicianStats = summary?.technicianStats || [];
  const completedRev = metrics?.completedValueInr ?? 0;
  const activeVal = metrics?.activeBookingValueInr ?? metrics?.estimatedValueInr ?? 0;
  const avgTicket =
    metrics?.averageTicketSizeInr ??
    (metrics?.totalBookings && metrics.totalBookings > 0
      ? Math.round((metrics.estimatedValueInr || 0) / metrics.totalBookings)
      : 0);

  return (
    <div className="admin-view-container container">
      {/* Page Header */}
      <div className="admin-view-header">
        <div>
          <h2>Business Reports &amp; Data Exports</h2>
          <p>Operational performance, technician distribution, and administrative CSV exports</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-secondary refresh-btn"
            onClick={() => loadReports(startDate, endDate)}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="reports-filter-card">
        <form onSubmit={handleApplyFilter} className="reports-filter-form">
          <div className="filter-field-group">
            <Calendar size={16} className="text-slate-500" />
            <label htmlFor="report-start-date" className="filter-label">From:</label>
            <input
              id="report-start-date"
              type="date"
              className="reports-date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="filter-field-group">
            <Calendar size={16} className="text-slate-500" />
            <label htmlFor="report-end-date" className="filter-label">To:</label>
            <input
              id="report-end-date"
              type="date"
              className="reports-date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="filter-actions-group">
            <button type="submit" className="btn-primary-sm">
              Apply Filter
            </button>
            {(startDate || endDate) && (
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={handleClearFilter}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {summary?.appliedFilter && (
          <div className="filter-active-pill">
            <span>Filtered: {summary.appliedFilter.startDate} to {summary.appliedFilter.endDate}</span>
          </div>
        )}
      </div>

      {/* Export Status Notification Banner */}
      {exportStatus.type !== 'idle' && (
        <div
          className={`reports-status-banner ${
            exportStatus.type === 'loading'
              ? 'banner-loading'
              : exportStatus.type === 'success'
              ? 'banner-success'
              : 'banner-error'
          }`}
        >
          {exportStatus.type === 'loading' && <RefreshCw size={16} className="spin" />}
          {exportStatus.type === 'success' && <CheckCircle2 size={16} />}
          {exportStatus.type === 'error' && <AlertCircle size={16} />}
          <span>{exportStatus.message}</span>
          <button
            type="button"
            className="banner-close-btn"
            onClick={() => setExportStatus({ type: 'idle' })}
          >
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* SECTION A: BUSINESS SUMMARY */}
      <section className="reports-section">
        <div className="reports-section-header">
          <div>
            <h3 className="section-title">A. Business Summary</h3>
            <p className="section-subtitle">Real-time revenue reconciliation and average service ticket economics</p>
          </div>
        </div>

        <div className="business-summary-grid">
          {/* Card 1: Completed Service Revenue */}
          <div className="summary-card card-revenue">
            <div className="summary-card-top">
              <div className="summary-icon-wrapper icon-green">
                <CheckCircle2 size={22} />
              </div>
              <span className="summary-badge badge-green">Realized Revenue</span>
            </div>
            <div className="summary-card-body">
              <span className="summary-metric-label">Completed Service Revenue</span>
              <div className="summary-metric-value text-green-700">
                <IndianRupee size={22} className="inline mr-1" />
                <span>{completedRev.toLocaleString('en-IN')}</span>
              </div>
              <p className="summary-metric-desc">
                Calculated strictly from service jobs marked as <strong>Completed</strong>.
              </p>
            </div>
          </div>

          {/* Card 2: Active Booking Value */}
          <div className="summary-card card-pipeline">
            <div className="summary-card-top">
              <div className="summary-icon-wrapper icon-blue">
                <TrendingUp size={22} />
              </div>
              <span className="summary-badge badge-blue">Pipeline Value</span>
            </div>
            <div className="summary-card-body">
              <span className="summary-metric-label">Active Booking Value</span>
              <div className="summary-metric-value text-blue-700">
                <IndianRupee size={22} className="inline mr-1" />
                <span>{activeVal.toLocaleString('en-IN')}</span>
              </div>
              <p className="summary-metric-desc">
                Total value of active pipeline jobs (<strong>Pending</strong>, <strong>Confirmed</strong>, <strong>In Progress</strong>).
              </p>
            </div>
          </div>

          {/* Card 3: Average Service Ticket Size */}
          <div className="summary-card card-ticket">
            <div className="summary-card-top">
              <div className="summary-icon-wrapper icon-amber">
                <Receipt size={22} />
              </div>
              <span className="summary-badge badge-amber">Ticket Economics</span>
            </div>
            <div className="summary-card-body">
              <span className="summary-metric-label">Average Service Ticket Size</span>
              <div className="summary-metric-value text-slate-800">
                <IndianRupee size={22} className="inline mr-1" />
                <span>{avgTicket.toLocaleString('en-IN')}</span>
              </div>
              <p className="summary-metric-desc">
                Average transaction value across non-cancelled service bookings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B: TECHNICIAN WORKLOAD */}
      <section className="reports-section">
        <div className="reports-section-header">
          <div>
            <h3 className="section-title">B. Technician Workload</h3>
            <p className="section-subtitle">Dispatch distribution, active jobs underway, and fulfillment tracking</p>
          </div>
        </div>

        <div className="admin-card overflow-hidden">
          {technicianStats.length === 0 ? (
            <div className="reports-empty-state">
              <Users size={32} className="text-slate-400 mb-2" />
              <p>No technician records available for the selected period.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="technician-workload-table">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th className="text-center">Assigned Jobs</th>
                    <th className="text-center">Completed</th>
                    <th className="text-center">Active / Remaining</th>
                    <th>Fulfillment Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {technicianStats.map((t) => {
                    const assigned = t.assigned_jobs || 0;
                    const completed = t.completed_jobs || 0;
                    const active = t.active_jobs !== undefined ? t.active_jobs : Math.max(0, assigned - completed);
                    const pct = assigned > 0 ? Math.min(100, Math.round((completed / assigned) * 100)) : 0;

                    return (
                      <tr key={t.id}>
                        <td>
                          <div className="tech-cell-profile">
                            <div className="tech-avatar-circle">
                              {t.full_name.charAt(0)}
                            </div>
                            <span className="tech-name-label">{t.full_name}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="metric-pill pill-slate">{assigned}</span>
                        </td>
                        <td className="text-center">
                          <span className="metric-pill pill-green">{completed}</span>
                        </td>
                        <td className="text-center">
                          <span className={`metric-pill ${active > 0 ? 'pill-blue' : 'pill-gray'}`}>
                            {active}
                          </span>
                        </td>
                        <td>
                          <div className="progress-cell-wrapper">
                            <div className="progress-track">
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="progress-pct-label">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* SECTION C: DATA EXPORTS */}
      <section className="reports-section">
        <div className="reports-section-header">
          <div>
            <h3 className="section-title">C. Administrative Data Exports</h3>
            <p className="section-subtitle">
              Verified operational records exported in RFC 4180 CSV format with spreadsheet formula injection protection
            </p>
          </div>
        </div>

        <div className="data-exports-grid">
          {/* Export Bookings */}
          <div className="export-action-card">
            <div className="export-action-header">
              <div className="export-icon-box bg-blue-50 text-blue-600">
                <ClipboardList size={22} />
              </div>
              <h4 className="export-action-title">Bookings Dataset</h4>
            </div>
            <p className="export-action-desc">
              All booking records including reference IDs, customer details, schedule dates, time slots, pricing, and fulfillment statuses.
            </p>
            <button
              type="button"
              className="btn-export-action"
              onClick={() => handleDownloadCsv('bookings')}
            >
              <Download size={15} /> Export Bookings CSV
            </button>
          </div>

          {/* Export Services */}
          <div className="export-action-card">
            <div className="export-action-header">
              <div className="export-icon-box bg-emerald-50 text-emerald-600">
                <Wrench size={22} />
              </div>
              <h4 className="export-action-title">Services Dataset</h4>
            </div>
            <p className="export-action-desc">
              Comprehensive catalog entries, service categories, descriptions, base prices, estimated durations, and active statuses.
            </p>
            <button
              type="button"
              className="btn-export-action"
              onClick={() => handleDownloadCsv('services')}
            >
              <Download size={15} /> Export Services CSV
            </button>
          </div>

          {/* Export Customers */}
          <div className="export-action-card">
            <div className="export-action-header">
              <div className="export-icon-box bg-indigo-50 text-indigo-600">
                <Users size={22} />
              </div>
              <h4 className="export-action-title">Customers Dataset</h4>
            </div>
            <p className="export-action-desc">
              Registered customer directory with full names, verified emails, phone numbers, Pune localities, and account creation dates.
            </p>
            <button
              type="button"
              className="btn-export-action"
              onClick={() => handleDownloadCsv('customers')}
            >
              <Download size={15} /> Export Customers CSV
            </button>
          </div>

          {/* Export Enquiries */}
          <div className="export-action-card">
            <div className="export-action-header">
              <div className="export-icon-box bg-amber-50 text-amber-600">
                <MessageSquare size={22} />
              </div>
              <h4 className="export-action-title">Enquiries Dataset</h4>
            </div>
            <p className="export-action-desc">
              Customer inquiries submitted via the contact portal, service requests, customer messages, and internal follow-up notes.
            </p>
            <button
              type="button"
              className="btn-export-action"
              onClick={() => handleDownloadCsv('enquiries')}
            >
              <Download size={15} /> Export Enquiries CSV
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
