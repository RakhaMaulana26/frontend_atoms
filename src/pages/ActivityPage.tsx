import React, { useState, useEffect } from 'react';
import { Activity, Search, RefreshCw, TrendingUp, Clock } from 'lucide-react';
import { PageHeader, LoadingScreen } from '../components';
import { useDataCache } from '../contexts/DataCacheContext';
import { activityLogService, type ActivityLog, type ActivityLogFilters, type ActivityLogStatistics } from '../services/activityLogService';

const ActivityPage: React.FC = () => {
  const { 
    recentActivities: cachedActivities, 
    activityStatistics: cachedStatistics,
    refreshActivities 
  } = useDataCache();
  
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [statistics, setStatistics] = useState<ActivityLogStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter and pagination state
  const [filters, setFilters] = useState<ActivityLogFilters>({
    page: 1,
    per_page: 20
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

  const fetchStatistics = async () => {
    try {
      const response = await activityLogService.getStatistics();
      setStatistics(response.data || response);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      // Use cached data if available
      if (cachedActivities && cachedActivities.length > 0) {
        setActivities(cachedActivities);
      }
      
      if (cachedStatistics) {
        setStatistics(cachedStatistics);
      }
      
      // Fetch fresh data
      await Promise.all([
        fetchActivities(),
        fetchStatistics()
      ]);
      
      setIsLoading(false);
    };

    loadInitialData();
  }, [cachedActivities, cachedStatistics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshActivities();
    await Promise.all([
      fetchActivities(),
      fetchStatistics()
    ]);
    setIsRefreshing(false);
  };

  const handleSearch = () => {
    const newFilters: ActivityLogFilters = {
      page: 1,
      per_page: 20,
      search: searchTerm || undefined
    };
    setFilters(newFilters);
    fetchActivities(newFilters);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    const newFilters: ActivityLogFilters = { page: 1, per_page: 20 };
    setFilters(newFilters);
    fetchActivities(newFilters);
  };

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
        { label: 'Activity Log', href: '/activity-log' }
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

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Action Logs */}
          <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl border-2 border-green-300 p-5 transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center border-2 border-green-600">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-700 mb-0.5">Action Logs</p>
                <p className="text-3xl font-bold text-green-900">{statistics.total_activities.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Shift Reports */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border-2 border-blue-300 p-5 transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center border-2 border-blue-600">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-700 mb-0.5">Shift Reports</p>
                <p className="text-3xl font-bold text-blue-900">
                  {statistics.by_module?.['Shift Request'] || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Maintenance Reports */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border-2 border-amber-300 p-5 transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center border-2 border-amber-600">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-700 mb-0.5">Maintenance Reports</p>
                <p className="text-3xl font-bold text-amber-900">
                  {statistics.by_action?.['Maintenance'] || statistics.today_activities || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
            <div className="inline-flex group h-[42px] items-end">
              <button 
                onClick={handleSearch}
                className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none select-none px-4 py-2 text-sm bg-[#454D7C] text-white group-hover:bg-[#3a4166] border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-[#222E6A] transform group-hover:translate-y-[2px] group-active:translate-y-[4px] whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </div>
          <div className="inline-flex group h-[42px] items-end">
            <button className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none select-none px-4 py-2 text-sm bg-gradient-to-b from-[#66BB6A] to-[#4CAF50] text-white group-hover:from-[#4CAF50] group-hover:to-[#43A047] border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-[#43A047] transform group-hover:translate-y-[2px] group-active:translate-y-[4px] whitespace-nowrap gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#222E6A]"></div>
            <span className="ml-3 text-gray-600">Loading activities...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mx-6 shadow-md">
              <p className="text-red-600 font-bold">Error loading activities</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <div className="inline-flex group h-[42px] items-end mt-3">
                <button 
                  onClick={() => fetchActivities()}
                  className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none select-none px-4 py-2 text-sm bg-gradient-to-b from-[#EF5350] to-[#E53935] text-white group-hover:from-[#E53935] group-hover:to-[#D32F2F] border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-[#D32F2F] transform group-hover:translate-y-[2px] group-active:translate-y-[4px]"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Activities Found</h3>
            <p className="text-gray-600">No activities match your current filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {activities.map((activity) => {
                    const timestamp = new Date(activity.created_at);
                    const status = activity.action.toLowerCase().includes('failed') || activity.action.toLowerCase().includes('delete') 
                      ? 'Failed' 
                      : activity.action.toLowerCase().includes('reject') || activity.action.toLowerCase().includes('banned')
                      ? 'Banned'
                      : 'Success';
                    
                    return (
                      <tr key={activity.id} className="hover:bg-blue-50/70 transition-all duration-150 hover:shadow-sm border-l-4 border-transparent hover:border-l-blue-500">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {timestamp.toLocaleString('id-ID', { 
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {activity.user?.name || 'System'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {activity.user?.email || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activity.user?.email?.includes('admin') ? 'Admin' : 
                           activity.user?.email?.includes('cns') ? 'CNS' :
                           activity.user?.email?.includes('support') ? 'Support' : 'User'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md">
                            {activity.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activity.module}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-lg border-2 ${
                            status === 'Success' 
                              ? 'bg-green-100 text-green-800 border-green-400' 
                              : status === 'Failed'
                              ? 'bg-red-100 text-red-800 border-red-400'
                              : 'bg-orange-100 text-orange-800 border-orange-400'
                          }`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {activities.map((activity) => {
                const timestamp = new Date(activity.created_at);
                const status = activity.action.toLowerCase().includes('failed') || activity.action.toLowerCase().includes('delete') 
                  ? 'Failed' 
                  : activity.action.toLowerCase().includes('reject') || activity.action.toLowerCase().includes('banned')
                  ? 'Banned'
                  : 'Success';
                
                return (
                  <div key={activity.id} className="p-4 hover:bg-blue-50/70 transition-all duration-200 hover:shadow-sm border-l-4 border-transparent hover:border-l-blue-500">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.user?.name || 'System'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {timestamp.toLocaleString('id-ID', { 
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold rounded-lg border-2 ${
                        status === 'Success' 
                          ? 'bg-green-100 text-green-800 border-green-400' 
                          : status === 'Failed'
                          ? 'bg-red-100 text-red-800 border-red-400'
                          : 'bg-orange-100 text-orange-800 border-orange-400'
                      }`}>
                        {status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2 font-medium">{activity.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-300 font-semibold">{activity.module}</span>
                      <span>•</span>
                      <span className="font-medium">{activity.user?.email?.includes('admin') ? 'Admin' : 
                             activity.user?.email?.includes('cns') ? 'CNS' :
                             activity.user?.email?.includes('support') ? 'Support' : 'User'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t-2 border-gray-200 bg-gray-50">
                <div className="text-xs sm:text-sm text-gray-700 font-semibold text-center sm:text-left">
                  Showing {(currentPage - 1) * filters.per_page! + 1} to {Math.min(currentPage * filters.per_page!, totalItems)} of {totalItems} items
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="inline-flex group h-[34px] items-end">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="hidden sm:inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none select-none px-3 py-1.5 text-sm border-2 border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-[#454D7C] text-[#454D7C] group-hover:bg-gradient-to-b group-hover:from-[#EEF0FF] group-hover:to-[#E3E6FF] bg-white transform group-hover:translate-y-[2px] group-active:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      Previous
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      
                      return (
                        <div key={page} className="inline-flex group h-[34px] items-end">
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 focus:outline-none select-none px-2.5 sm:px-3 py-1.5 text-sm border-2 transform ${
                              page === currentPage 
                                ? 'bg-[#454D7C] text-white border-b-[6px] border-[#222E6A]' 
                                : 'bg-white text-gray-700 border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-gray-400 group-hover:bg-gradient-to-b group-hover:from-[#F9FAFB] group-hover:to-[#F3F4F6] group-hover:translate-y-[2px] group-active:translate-y-[4px]'
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="px-2 text-gray-500 font-bold">...</span>
                        <div className="inline-flex group h-[34px] items-end">
                          <button
                            onClick={() => handlePageChange(totalPages)}
                            className="inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 focus:outline-none select-none px-2.5 sm:px-3 py-1.5 text-sm bg-white text-gray-700 border-2 border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-gray-400 group-hover:bg-gradient-to-b group-hover:from-[#F9FAFB] group-hover:to-[#F3F4F6] transform group-hover:translate-y-[2px] group-active:translate-y-[4px]"
                          >
                            {totalPages}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="inline-flex group h-[34px] items-end">
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="hidden sm:inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none select-none px-3 py-1.5 text-sm border-2 border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-[#454D7C] text-[#454D7C] group-hover:bg-gradient-to-b group-hover:from-[#EEF0FF] group-hover:to-[#E3E6FF] bg-white transform group-hover:translate-y-[2px] group-active:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageHeader>
  );
};

export default ActivityPage;