import React, { useEffect, useState } from 'react';
import { api, NotificationItem } from '../services/api';
import { X, Bell, CheckCircle2, Clock } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshCount: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  onRefreshCount,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      onRefreshCount();
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      onRefreshCount();
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content notification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="title-with-icon">
            <Bell size={22} color="#2563eb" />
            <h3>Your Notifications</h3>
          </div>
          <div className="header-actions">
            {notifications.some((n) => n.is_read === 0) && (
              <button type="button" className="text-action-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="notification-list">
          {loading ? (
            <p className="empty-state">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <div className="empty-notif-box">
              <CheckCircle2 size={36} color="#94a3b8" />
              <p>You have no notifications yet.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`notification-card ${n.is_read ? 'read' : 'unread'}`}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
              >
                <div className="notif-header">
                  <h4>{n.title}</h4>
                  <span className="notif-time">
                    <Clock size={12} /> {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p>{n.message}</p>
                {!n.is_read && <span className="unread-dot" title="Unread" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
