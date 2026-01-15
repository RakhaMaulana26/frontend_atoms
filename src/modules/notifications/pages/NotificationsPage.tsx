import React, { useState, useEffect } from 'react';
import { useToast } from '../../../components/common/ToastContext';
import { notificationService } from '../repository/notificationService';
import type { Notification } from '../../../types';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { Bell, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await notificationService.getNotifications();
      // Ensure data is an array
      if (Array.isArray(data)) {
        setNotifications(data);
      } else if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
        // Handle if API returns { data: [...] }
        setNotifications((data as any).data);
      } else {
        setNotifications([]);
        showToast('No notifications found', 'info');
      }
    } catch (error: any) {
      showToast('Failed to load notifications', 'error');
      setNotifications([]); // Set to empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, is_read: true, read_at: new Date().toISOString() } : notif
        )
      );
      showToast('Notification marked as read', 'success');
    } catch (error: any) {
      showToast('Failed to mark as read', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    // Ensure notifications is an array before filtering
    if (!Array.isArray(notifications)) return;
    
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      await notificationService.markAllAsRead(unreadIds);
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true, read_at: new Date().toISOString() }))
      );
      showToast('All notifications marked as read', 'success');
    } catch (error: any) {
      showToast('Failed to mark all as read', 'error');
    }
  };

  const unreadCount = Array.isArray(notifications) ? notifications.filter((n) => !n.is_read).length : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      <Card>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : !Array.isArray(notifications) || notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600">You're all caught up! No new notifications.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                      notification.is_read ? 'bg-gray-200' : 'bg-primary-100'
                    }`}
                  >
                    <Bell
                      className={`h-5 w-5 ${
                        notification.is_read ? 'text-gray-500' : 'text-primary-600'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {format(new Date(notification.created_at), 'PPpp')}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      Mark as Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;
