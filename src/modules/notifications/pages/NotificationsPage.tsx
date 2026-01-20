import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useDataCache } from '../../../contexts/DataCacheContext';
import { notificationService } from '../repository/notificationService';
import Card from '../../../components/common/Card';
import PageHeader from '../../../components/layout/PageHeader';
import { Bell, CheckCheck, X, Clock, MessageSquare } from 'lucide-react';
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
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {notification.message}
                </p>
                <div className="flex items-center mt-4 text-xs text-gray-400 space-x-2">
                  <Clock className="h-3 w-3" />
                  <span>
                    {format(new Date(notification.created_at), 'EEEE, MMMM dd, yyyy \'at\' HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#222E6A] text-base font-medium text-white hover:bg-[#1a2550] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#222E6A] sm:ml-3 sm:w-auto sm:text-sm"
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
  const { notifications, unreadNotificationCount, refreshNotifications, markNotificationAsRead } = useDataCache();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const unreadCount = unreadNotificationCount;

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      markNotificationAsRead(notificationId);
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsLoading(true);
      // Get unread notification IDs
      const unreadNotifications = notifications.filter(n => !n.is_read);
      const unreadIds = unreadNotifications.map(n => n.id);
      
      if (unreadIds.length > 0) {
        await notificationService.markAllAsRead(unreadIds);
        refreshNotifications();
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    setSelectedNotification(notification);
    setIsModalOpen(true);
    
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNotification(null);
  };

  return (
    <PageHeader
      title="Notifications"
      subtitle={unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Notifications', href: '/notifications' }
      ]}
    >
      {/* Header Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] p-3 rounded-xl relative">
              <Bell className="h-8 w-8 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Your Notifications</h2>
              <p className="text-gray-600 text-sm">
                {notifications.length} total notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isLoading}
              className="bg-[#222E6A] hover:bg-[#1a2550] text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center shadow-md disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              {isLoading ? 'Marking...' : 'Mark All as Read'}
            </button>
          )}
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <span className="text-sm text-gray-600">
            {unreadCount} of {notifications.length} unread
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#454D7C] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-[#D8DAED] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="h-10 w-10 text-[#454D7C]" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications Yet</h3>
            <p className="text-gray-600">When you have notifications, they'll appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  notification.is_read
                    ? 'border-gray-200 bg-white hover:bg-gray-50'
                    : 'border-blue-200 bg-blue-50 hover:bg-blue-100 shadow-sm'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                    notification.is_read ? 'bg-gray-300' : 'bg-blue-500'
                  }`}></div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-medium ${
                        notification.is_read ? 'text-gray-700' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h4>
                      <div className="flex items-center text-xs text-gray-500 space-x-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    </div>
                    <p className={`text-sm ${
                      notification.is_read ? 'text-gray-500' : 'text-gray-700'
                    } line-clamp-2`}>
                      {notification.message}
                    </p>
                    {notification.type && (
                      <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full font-medium ${
                        notification.type === 'success' ? 'bg-green-100 text-green-800' :
                        notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        notification.type === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {notification.type}
                      </span>
                    )}
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

      {/* Notification Detail Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </PageHeader>
  );
};

export default NotificationsPage;