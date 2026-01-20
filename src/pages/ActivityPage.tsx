import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter, Calendar, RefreshCw, TrendingUp, Clock, Hash } from 'lucide-react';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ActivityLogCard from '../components/activity/ActivityLogCard';
import PageHeader from '../components/layout/PageHeader';
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
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedDateFrom, setSelectedDateFrom] = useState<string>('');
  const [selectedDateTo, setSelectedDateTo] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const modules = ['User Management', 'Roster', 'Shift Request', 'Authentication', 'Notification'];

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

  const handleApplyFilters = () => {
    const newFilters: ActivityLogFilters = {
      page: 1,
      per_page: 20,
      search: searchTerm || undefined,
      module: selectedModule || undefined,
      date_from: selectedDateFrom || undefined,
      date_to: selectedDateTo || undefined
    };
    setFilters(newFilters);
    fetchActivities(newFilters);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedModule('');
    setSelectedDateFrom('');
    setSelectedDateTo('');
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
      <PageHeader
        title="Activity Log"
        subtitle="Track all system activities and user actions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Activity Log', href: '/activity-log' }
        ]}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading activity data...</p>
          </div>
        </div>
      </PageHeader>
    );
  }

  return (
    <PageHeader
      title="Activity Log"
      subtitle="Track all system activities and user actions"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Activity Log', href: '/activity-log' }
      ]}
    >
      {/* Header Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-[#222E6A]" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">System Activity</h2>
              <p className="text-gray-600 text-sm">
                {totalItems} total activities tracked
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[#222E6A] hover:bg-[#1a2550] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Activities</p>
                <p className="text-2xl font-bold text-[#222E6A]">{statistics.total_activities.toLocaleString()}</p>
              </div>
              <Hash className="h-8 w-8 text-[#222E6A]" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-2xl font-bold text-green-600">{statistics.today_activities.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.week_activities.toLocaleString()}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-purple-600">{statistics.total_activities > 100 ? 'High' : 'Normal'}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filter Activities</h3>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg transition-colors"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search activities..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
              <select 
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
              >
                <option value="">All Modules</option>
                {modules.map((module) => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={selectedDateFrom}
                onChange={(e) => setSelectedDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={selectedDateTo}
                onChange={(e) => setSelectedDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          <button 
            onClick={handleApplyFilters}
            className="flex items-center gap-2 px-4 py-2 bg-[#222E6A] hover:bg-[#1a2550] text-white rounded-lg transition-colors"
          >
            Apply Filters
          </button>
          <button 
            onClick={handleClearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg transition-colors"
          >
            Clear All
          </button>
        </div>
      </Card>

      {/* Activity List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Page {currentPage} of {totalPages}</span>
            <span>•</span>
            <span>{totalItems} total items</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Loading activities...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-600 font-medium">Error loading activities</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <button 
                onClick={() => fetchActivities()}
                className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
              >
                Retry
              </button>
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
            {/* Activities List */}
            <div className="space-y-4 mb-6">
              {activities.map((activity) => (
                <ActivityLogCard key={activity.id} activity={activity} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * filters.per_page! + 1} to {Math.min(currentPage * filters.per_page!, totalItems)} of {totalItems} results
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      Previous
                    </button>
                    
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
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                              page === currentPage 
                                ? 'bg-[#222E6A] text-white' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </PageHeader>
  );
};

export default ActivityPage;