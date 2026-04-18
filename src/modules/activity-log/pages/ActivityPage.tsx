import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Search, RefreshCw } from 'lucide-react';
import { PageHeader, LoadingScreen } from '../../../components';
import { useDataCache } from '../../../contexts/DataCacheContext';
import { activityLogService, type ActivityLog, type ActivityLogFilters } from '../repository/activityLogService';

const ActivityPage: React.FC = () => {
  const {
    recentActivities: cachedActivities,
    refreshActivities,
  } = useDataCache();

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter and pagination state
  const [filters, setFilters] = useState<ActivityLogFilters>({
    page: 1,
    per_page: 20,
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchActivities = async (newFilters?: ActivityLogFilters) => {
    try {
      const filtersToUse = { ...filters, ...newFilters };
      const response = await activityLogService.getActivityLogs(filtersToUse);

      setActivities(response.data);
      setCurrentPage(response.meta.current_page);
      setTotalPages(response.meta.last_page);
      setTotalItems(response.meta.total);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setError('Failed to load activities. Please try again.');
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);

      // Use cached data if available
      if (cachedActivities && cachedActivities.length > 0) {
        setActivities(cachedActivities);
      }

      // Fetch fresh data
      await fetchActivities();

      setIsLoading(false);
    };

    loadInitialData();
  }, [cachedActivities]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshActivities();
    await fetchActivities();
    setIsRefreshing(false);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    const newFilters: ActivityLogFilters = { page: 1, per_page: 20 };
    setFilters(newFilters);
    fetchActivities(newFilters);
  };
  const filteredActivities = useMemo(() => {
    if (!searchTerm.trim()) return activities;
    const query = searchTerm.trim().toLowerCase();

    return activities.filter((activity) => {
      return (
        activity.description.toLowerCase().includes(query) ||
        activity.module.toLowerCase().includes(query) ||
        activity.action.toLowerCase().includes(query) ||
        (activity.user?.name || '').toLowerCase().includes(query) ||
        (activity.user?.email || '').toLowerCase().includes(query)
      );
    });
  }, [activities, searchTerm]);

  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    fetchActivities(newFilters);
  };

  // Show loading state for initial load only
  if (isLoading && activities.length === 0) {
    return (
      <LoadingScreen
        title="Loading Activity Log"
        subtitle="Please wait while we fetch activity data..."
        icon={Activity}
      />
    );
  }

  return (
    <PageHeader
      title="Activity Log"
      subtitle="Track all system activities and user actions"
      breadcrumbs={[
        { label: 'Activity Log', href: '/activity-log' },
      ]}
    >
      {/* Header Actions */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-6 transition-all duration-200 hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#222E6A]/10 border-2 border-[#222E6A]">
              <Activity className="h-6 w-6 text-[#222E6A]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">System Activity</h2>
              <p className="text-gray-600 text-sm">
                {totalItems} total activities tracked
              </p>
            </div>
          </div>
          <div className="inline-flex group h-[42px] items-end">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none px-4 py-2 text-base bg-[#454D7C] text-white group-hover:bg-[#3a4166] border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-[#222E6A] transform group-hover:translate-y-[2px] group-active:translate-y-[4px]"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md">
        {/* Table Header with Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b-2 border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Action Logs</h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 sm:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search activities..."
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-[#222E6A] text-sm font-medium transition-all duration-150"
              />
            </div>
            {searchTerm && (
              <div className="inline-flex group h-[42px] items-end">
                <button
                  onClick={handleClearSearch}
                  className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none select-none px-3 py-2 text-sm border-2 border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-[#454D7C] text-[#454D7C] group-hover:bg-gradient-to-b group-hover:from-[#EEF0FF] group-hover:to-[#E3E6FF] bg-white transform group-hover:translate-y-[2px] group-active:translate-y-[4px] whitespace-nowrap"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="px-6 py-4 text-sm text-red-600 bg-red-50 border-b border-red-200">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#222E6A] text-white">
                <th className="px-4 py-3 text-left font-semibold">Aktivitas</th>
                <th className="px-4 py-3 text-left font-semibold">Modul</th>
                <th className="px-4 py-3 text-left font-semibold">Aksi</th>
                <th className="px-4 py-3 text-left font-semibold">Pengguna</th>
                <th className="px-4 py-3 text-left font-semibold">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((activity) => (
                  <tr key={activity.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{activity.description}</td>
                    <td className="px-4 py-3 text-gray-700">{activity.module}</td>
                    <td className="px-4 py-3 text-gray-700">{activity.action}</td>
                    <td className="px-4 py-3 text-gray-700">{activity.user?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{new Date(activity.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </PageHeader>
  );
};

export default ActivityPage;
