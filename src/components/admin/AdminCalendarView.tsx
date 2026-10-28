import React, { useState, useEffect } from 'react';
import { api, Booking } from '../../services/api';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, RefreshCw } from 'lucide-react';

export const AdminCalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayBookings, setSelectedDayBookings] = useState<{ date: string; items: Booking[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const loadMonthBookings = async () => {
    setLoading(true);
    try {
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      const res = await api.getBookings();
      const thisMonth = res.bookings.filter((b) => b.booking_date.startsWith(monthStr));
      setBookings(thisMonth);
    } catch (err) {
      console.error('Failed to load calendar bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthBookings();
  }, [year, month]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayBookings(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayBookings(null);
  };

  return (
    <div className="admin-view-container container">
      <div className="admin-view-header">
        <div>
          <h2>Service Scheduling Calendar</h2>
          <p>Inspect technician workload and appointment density across Pune</p>
        </div>
        <div className="calendar-nav-controls">
          <button type="button" className="btn-secondary" onClick={prevMonth}>
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="current-month-label">
            {monthNames[month]} {year}
          </span>
          <button type="button" className="btn-secondary" onClick={nextMonth}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="calendar-card">
        {loading ? (
          <div className="dashboard-loading">
            <RefreshCw size={28} className="spin" />
            <p>Loading monthly appointments...</p>
          </div>
        ) : (
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="calendar-day-header">
                {d}
              </div>
            ))}

            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-cell empty" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayBookings = bookings.filter((b) => b.booking_date === dateStr);
              const isToday =
                new Date().toISOString().slice(0, 10) === dateStr;

              return (
                <div
                  key={day}
                  className={`calendar-cell ${isToday ? 'today' : ''} ${dayBookings.length > 0 ? 'has-jobs' : ''}`}
                  onClick={() => {
                    if (dayBookings.length > 0) {
                      setSelectedDayBookings({ date: dateStr, items: dayBookings });
                    }
                  }}
                >
                  <div className="day-number">{day}</div>
                  <div className="day-indicators">
                    {dayBookings.slice(0, 3).map((b) => (
                      <div
                        key={b.id}
                        className={`day-job-badge ${b.status.toLowerCase().replace(' ', '-')}`}
                        title={`${b.time_slot}: ${b.service_name_snapshot} (${b.locality})`}
                      >
                        <span className="badge-time">{b.time_slot.split(' - ')[0]}</span>
                        <span className="badge-title">{b.service_name_snapshot}</span>
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <span className="more-count">+{dayBookings.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Day Bookings Detail Modal */}
      {selectedDayBookings && (
        <div className="modal-overlay" onClick={() => setSelectedDayBookings(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="title-with-icon">
                <CalendarIcon size={20} color="#2563eb" />
                <h3>Appointments on {selectedDayBookings.date}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedDayBookings(null)}>
                ✕
              </button>
            </div>

            <div className="day-bookings-list">
              {selectedDayBookings.items.map((b) => (
                <div key={b.id} className="day-booking-item">
                  <div className="item-header">
                    <strong>{b.service_name_snapshot}</strong>
                    <span className={`status-pill ${b.status.toLowerCase().replace(' ', '-')}`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="item-meta">
                    <span><Clock size={14} /> {b.time_slot}</span>
                    <span><MapPin size={14} /> {b.locality}, Pune</span>
                  </div>
                  <div className="item-sub">
                    <small>Customer: {b.customer_name} ({b.contact_number})</small>
                    <small>
                      Technician: {b.professional_name || 'Unassigned'}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
