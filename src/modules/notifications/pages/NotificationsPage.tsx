import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../auth/core/AuthContext';
import { useDataCache } from '../../../contexts/DataCacheContext';
import { notificationService } from '../repository/notificationService';
import Card from '../../../components/common/Card';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { Bell, CheckCheck, User, X, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

// Notification Detail Modal Component
const NotificationDetailModal: React.FC<{
  notification: any;
  isOpen: boolean;
  onClose: () => void;
}> = ({ notification, isOpen, onClose }) => {
  if (!isOpen || !notification) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
              notification.is_read ? 'bg-gray-100' : 'bg-blue-100'
            }`}>
              <MessageSquare className={`h-6 w-6 ${notification.is_read ? 'text-gray-600' : 'text-blue-600'}`} />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {notification.title}
              </h3>
              <div className="mt-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {notification.message}
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>{format(new Date(notification.created_at), 'PPpp')}</span>
              </div>
              {!notification.is_read && (
                <div className="mt-3 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full inline-block">
                  New
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#454D7C] text-base font-medium text-white hover:bg-[#222E6A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#454D7C] sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    isInitialized,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refreshNotifications 
  } = useDataCache();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for notification detail modal
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Show loading if cache is not initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#454D7C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      // Optimistic update: update cache first
      markNotificationAsRead(id);
      
      // Send to backend in background
      await notificationService.markAsRead(id);
      toast.success('Notification marked as read');
    } catch (error: any) {
      toast.error('Failed to mark as read');
      // Refresh to get correct state on error
      refreshNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    // Ensure notifications is an array before filtering
    if (!Array.isArray(notifications)) return;
    
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      // Optimistic update: update cache first
      markAllNotificationsAsRead();
      
      // Send to backend in background
      await notificationService.markAllAsRead(unreadIds);
      toast.success('All notifications marked as read');
    } catch (error: any) {
      toast.error('Failed to mark all as read');
      // Refresh to get correct state on error
      refreshNotifications();
    }
  };

  // Handle notification click to view details
  const handleNotificationClick = async (notification: any) => {
    // Mark as read if it's not already read
    if (!notification.is_read) {
      try {
        // Optimistic update
        markNotificationAsRead(notification.id);
        // Send to backend in background
        await notificationService.markAsRead(notification.id);
      } catch (error: any) {
        toast.error('Failed to mark as read');
        // Refresh to get correct state on error
        refreshNotifications();
      }
    }
    
    // Open modal with notification details
    setSelectedNotification(notification);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNotification(null);
  };

  const unreadCount = Array.isArray(notifications) ? notifications.filter((n) => !n.is_read).length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs items={[{ label: 'Notifications' }]} />
            
            <button 
              onClick={() => navigate('/home')}
              className="flex items-center space-x-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
            >
              <User className="h-5 w-5" />
              <span className="text-sm hidden sm:inline">{user?.name}</span>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl relative">
                <Bell className="h-8 w-8 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">Notifications</h1>
                <p className="text-sm opacity-90">
                  {unreadCount > 0
                    ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                    : 'All caught up!'}
                </p>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="bg-white text-[#222E6A] hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center shadow-md"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All as Read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
        {!Array.isArray(notifications) || notifications.length === 0 ? (
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
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.is_read ? 'bg-[#D8DAED]/30' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                      notification.is_read ? 'bg-gray-200' : 'bg-[#D8DAED]'
                    }`}
                  >
                    <MessageSquare
                      className={`h-5 w-5 ${
                        notification.is_read ? 'text-gray-500' : 'text-[#454D7C]'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      {!notification.is_read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-2 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(notification.created_at), 'PPpp')}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering the row click
                          handleMarkAsRead(notification.id);
                        }}
                        className="text-sm text-[#222E6A] hover:text-[#454D7C] font-medium whitespace-nowrap"
                      >
                        Mark as Read
                      </button>
                    )}
                    <span className="text-xs text-gray-400">Click to view details</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      </div>

      {/* Notification Detail Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default NotificationsPage;
