import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { notificationService } from '../repository/notificationService';
import { PageHeader, Button, Modal } from '../../../components';
import { useDataCache } from '../../../contexts/DataCacheContext';
import type { User, Notification } from '../../../types';
import { 
  Inbox, Star, Send, Trash2, Mail, MailOpen, X, Clock, Plus, RefreshCw, Archive, Check, Search
} from 'lucide-react';
import { format } from 'date-fns';

type NotificationCategory = 'inbox' | 'starred' | 'sent' | 'trash';

const NotificationsPage: React.FC = () => {
  const { 
    users, 
    notificationsByCategory, 
    notificationStats, 
    loadingStates,
    refreshNotificationsByCategory,
    toggleNotificationStar,
    removeNotificationFromCategory,
    moveNotificationToTrash,
    restoreNotificationFromTrash,
    updateNotificationInCache,
  } = useDataCache();
  
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('inbox');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Compose form state
  const [composeForm, setComposeForm] = useState({
    title: '',
    message: '',
    send_email: false,
  });
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Ref for user dropdown to detect click outside
  const userDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };

    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserDropdownOpen]);
  
  // Get notifications for current category from cache
  const notifications = notificationsByCategory[activeCategory] || [];
  const stats = notificationStats;
  const isLoading = loadingStates.notifications;

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    const query = userSearchQuery.toLowerCase();
    return users.filter((user: User) => 
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  }, [users, userSearchQuery]);

  // Get selected users info
  const selectedUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user: User) => selectedUserIds.includes(user.id));
  }, [users, selectedUserIds]);

  // Refresh notifications for current category
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshNotificationsByCategory();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCategoryChange = (category: NotificationCategory) => {
    setActiveCategory(category);
  };

  const handleToggleStar = async (notification: Notification) => {
    try {
      // Optimistic update
      toggleNotificationStar(notification.id);
      
      await notificationService.toggleStar(notification.id);
      toast.success(notification.is_starred ? 'Removed from starred' : 'Added to starred');
    } catch (error: any) {
      // Revert on error
      toggleNotificationStar(notification.id);
      toast.error(error.response?.data?.message || 'Failed to update');
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return;
    
    try {
      // Optimistic update
      updateNotificationInCache(notification.id, { is_read: true, read_at: new Date().toISOString() });
      
      await notificationService.markAsRead(notification.id);
    } catch (error: any) {
      // Revert on error
      updateNotificationInCache(notification.id, { is_read: false, read_at: null });
      toast.error(error.response?.data?.message || 'Failed to mark as read');
    }
  };

  const handleDelete = async (notification: Notification) => {
    try {
      // Optimistic update - move to trash locally
      moveNotificationToTrash(notification.id, activeCategory);
      
      await notificationService.deleteNotification(notification.id);
      toast.success('Moved to trash');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
      // Refresh to restore state on error
      await refreshNotificationsByCategory();
    }
  };

  const handleRestore = async (notification: Notification) => {
    try {
      // Optimistic update - restore to inbox locally
      restoreNotificationFromTrash(notification);
      
      await notificationService.restoreNotification(notification.id);
      toast.success('Notification restored');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to restore');
      // Refresh to restore state on error
      await refreshNotificationsByCategory();
    }
  };

  const handlePermanentDelete = async (notification: Notification) => {
    if (!confirm('Are you sure you want to permanently delete this notification?')) return;
    
    try {
      // Optimistic update - remove from trash locally
      removeNotificationFromCategory(notification.id, 'trash');
      
      await notificationService.permanentDelete(notification.id);
      toast.success('Permanently deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
      // Refresh to restore state on error
      await refreshNotificationsByCategory();
    }
  };

  const handleViewDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailModalOpen(true);
    if (!notification.is_read) {
      handleMarkAsRead(notification);
    }
  };

  const handleToggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleRemoveSelectedUser = (userId: number) => {
    setSelectedUserIds(prev => prev.filter(id => id !== userId));
  };

  // Quick select functions
  const handleSelectAll = () => {
    if (!users) return;
    setSelectedUserIds(users.map((u: User) => u.id));
  };

  const handleSelectByRole = (role: string) => {
    if (!users) return;
    const roleUsers = users.filter((u: User) => u.role.toLowerCase() === role.toLowerCase());
    setSelectedUserIds(roleUsers.map((u: User) => u.id));
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleSendNotification = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    if (!composeForm.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!composeForm.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSending(true);
    try {
      await notificationService.sendNotification({
        user_ids: selectedUserIds,
        title: composeForm.title,
        message: composeForm.message,
        send_email: composeForm.send_email,
      });
      
      toast.success(`Notification sent to ${selectedUserIds.length} user(s)`);
      
      // Reset form
      setComposeForm({ title: '', message: '', send_email: false });
      setSelectedUserIds([]);
      setUserSearchQuery('');
      setIsComposeModalOpen(false);
      
      // Note: Sent notifications will appear after manual refresh
      // or we can do a background refresh without blocking UI
      refreshNotificationsByCategory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenCompose = () => {
    setComposeForm({ title: '', message: '', send_email: false });
    setSelectedUserIds([]);
    setUserSearchQuery('');
    setIsComposeModalOpen(true);
  };

  const categories = [
    { 
      key: 'inbox' as NotificationCategory, 
      label: 'Inbox', 
      icon: Inbox, 
      count: stats.inbox,
      bgColor: 'bg-emerald-50',
      bgColorActive: 'bg-emerald-100',
      borderColor: 'border-emerald-200',
      borderColorActive: 'border-emerald-500',
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-700',
      countColor: 'text-emerald-800',
    },
    { 
      key: 'starred' as NotificationCategory, 
      label: 'Starred', 
      icon: Star, 
      count: stats.starred,
      bgColor: 'bg-blue-50',
      bgColorActive: 'bg-blue-100',
      borderColor: 'border-blue-200',
      borderColorActive: 'border-blue-500',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-700',
      countColor: 'text-blue-800',
    },
    { 
      key: 'sent' as NotificationCategory, 
      label: 'Sent', 
      icon: Send, 
      count: stats.sent,
      bgColor: 'bg-rose-50',
      bgColorActive: 'bg-rose-100',
      borderColor: 'border-rose-200',
      borderColorActive: 'border-rose-500',
      iconColor: 'text-rose-600',
      textColor: 'text-rose-700',
      countColor: 'text-rose-800',
    },
    { 
      key: 'trash' as NotificationCategory, 
      label: 'Trash', 
      icon: Trash2, 
      count: stats.trash,
      bgColor: 'bg-red-50',
      bgColorActive: 'bg-red-100',
      borderColor: 'border-red-200',
      borderColorActive: 'border-red-500',
      iconColor: 'text-red-600',
      textColor: 'text-red-700',
      countColor: 'text-red-800',
    },
  ];

  return (
    <PageHeader
      title="Notifications"
      subtitle="Manage your inbox, starred, sent, and trash notifications"
      breadcrumbs={[
        { label: 'Notifications', href: '/notifications' }
      ]}
    >
      {/* Category Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.key;
          
          return (
            <button
              key={category.key}
              onClick={() => handleCategoryChange(category.key)}
              className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                isActive
                  ? `${category.borderColorActive} ${category.bgColorActive} shadow-lg ring-2 ring-offset-1 ring-${category.borderColorActive}`
                  : `${category.borderColor} ${category.bgColor} hover:shadow-md hover:scale-[1.02]`
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 text-sm font-medium ${category.textColor}`}>
                  <Icon className={`h-4 w-4 ${category.iconColor}`} />
                  <span>{category.label}</span>
                </div>
                <div className={`p-2 rounded-lg ${isActive ? category.bgColorActive : 'bg-white/50'}`}>
                  <Icon className={`h-5 w-5 ${category.iconColor}`} />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <span className={`text-4xl font-bold ${category.countColor}`}>
                  {category.count}
                </span>
                <div className={`flex items-center gap-1 ${category.iconColor} opacity-60`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(() => {
              const activeItem = categories.find(c => c.key === activeCategory);
              if (!activeItem) return null;
              const ActiveIcon = activeItem.icon;
              return (
                <div className={`p-2 rounded-lg ${activeItem.bgColorActive}`}>
                  <ActiveIcon className={`h-5 w-5 ${activeItem.iconColor}`} />
                </div>
              );
            })()}
            <h2 className="text-xl font-semibold text-gray-900">
              {categories.find(c => c.key === activeCategory)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={handleOpenCompose}
              className="bg-[#222E6A] hover:bg-[#1a2452]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No notifications in {activeCategory}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleToggleStar(notification)}
                    className="flex-shrink-0 mt-1"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        notification.is_starred
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300 hover:text-yellow-500'
                      }`}
                    />
                  </button>

                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleViewDetail(notification)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {!notification.is_read ? (
                        <Mail className="h-4 w-4 text-blue-600" />
                      ) : (
                        <MailOpen className="h-4 w-4 text-gray-400" />
                      )}
                      <h3 className={`font-semibold ${
                        !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {notification.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {notification.sender && (
                        <span className="flex items-center gap-1">
                          From: {notification.sender.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeCategory === 'trash' ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleRestore(notification)}
                          className="text-sm"
                        >
                          Restore
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handlePermanentDelete(notification)}
                          className="text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete Forever
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(notification)}
                        className="text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedNotification && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedNotification(null);
          }}
          title={selectedNotification.title}
          size="md"
        >
          <div className="space-y-4">
            {selectedNotification.sender && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>From:</strong> {selectedNotification.sender.name} ({selectedNotification.sender.email})
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-700 whitespace-pre-wrap">{selectedNotification.message}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              <span>{format(new Date(selectedNotification.created_at), 'EEEE, MMMM dd, yyyy \'at\' HH:mm')}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Compose Modal */}
      <Modal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        title="Compose Notification"
        size="lg"
      >
        <div className="space-y-4">
          {/* Recipients Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients <span className="text-red-500">*</span>
            </label>
            
            {/* Quick Select Buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-[#222E6A] text-white hover:bg-[#1a2452] transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => handleSelectByRole('CNS')}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              >
                CNS Only
              </button>
              <button
                type="button"
                onClick={() => handleSelectByRole('Support')}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
              >
                Support Only
              </button>
              <button
                type="button"
                onClick={() => handleSelectByRole('Manager Teknik')}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
              >
                Manager Teknik
              </button>
              <button
                type="button"
                onClick={() => handleSelectByRole('Admin')}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
              >
                Admin Only
              </button>
              {selectedUserIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 text-xs font-medium rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {/* Selected Users Tags */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-3 bg-gray-50 rounded-lg">
                {selectedUsers.map((user: User) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#222E6A] text-white rounded-full text-sm"
                  >
                    {user.name}
                    <button
                      onClick={() => handleRemoveSelectedUser(user.id)}
                      className="hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Search Input */}
            <div className="relative" ref={userDropdownRef}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  setIsUserDropdownOpen(true);
                }}
                onFocus={() => setIsUserDropdownOpen(true)}
                placeholder="Search users by name, email, or role..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
              />
              {/* Close button for dropdown */}
              {isUserDropdownOpen && (
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen(false)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              
              {/* User Dropdown */}
              {isUserDropdownOpen && filteredUsers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredUsers.map((user: User) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          handleToggleUserSelection(user.id);
                          setUserSearchQuery('');
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-b-0 ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                            {user.role}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-[#222E6A]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-1">
              {selectedUserIds.length} user(s) selected
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={composeForm.title}
              onChange={(e) => setComposeForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter notification title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={composeForm.message}
              onChange={(e) => setComposeForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter notification message"
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent resize-none"
            />
          </div>

          {/* Send Email Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="send_email"
              checked={composeForm.send_email}
              onChange={(e) => setComposeForm(prev => ({ ...prev, send_email: e.target.checked }))}
              className="h-4 w-4 text-[#222E6A] border-gray-300 rounded focus:ring-[#222E6A]"
            />
            <label htmlFor="send_email" className="text-sm text-gray-700">
              Also send email notification
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsComposeModalOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSendNotification}
              disabled={isSending}
              className="bg-[#222E6A] hover:bg-[#1a2452]"
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </PageHeader>
  );
};

export default NotificationsPage;
