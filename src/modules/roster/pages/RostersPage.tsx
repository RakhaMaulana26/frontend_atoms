import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Input from '../../../components/common/Input';
import PageHeader from '../../../components/layout/PageHeader';
import { Calendar, Plus, X } from 'lucide-react';
import { useDataCache } from '../../../contexts/DataCacheContext';
import { rosterService } from '../repository/rosterService';

// Create Roster Modal Component
const CreateRosterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!month || !year) {
      toast.error('Please select month and year');
      return;
    }

    setIsLoading(true);
    
    try {
      // Send only month and year - backend will auto-generate days
      const createRequest = {
        month,
        year
      };

      await rosterService.createRoster(createRequest);
      toast.success('Roster template created successfully!');
      onSuccess();
      onClose();
      
      // Reset form
      setMonth(new Date().getMonth() + 1);
      setYear(new Date().getFullYear());
    } catch (error: any) {
      console.error('Failed to create roster:', error);
      toast.error(error.response?.data?.message || 'Failed to create roster');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

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
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create New Roster Template
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                This will create a roster template with all days for the selected month. 
                You can assign managers and shift employees later.
              </p>
              <div className="mt-4">
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Month
                      </label>
                      <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {[...Array(12)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(0, i).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                      </label>
                      <Input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        min={new Date().getFullYear()}
                        max={new Date().getFullYear() + 2}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#454D7C] text-base font-medium text-white hover:bg-[#222E6A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#454D7C] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Creating Template...' : 'Create Roster Template'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RostersPage: React.FC = () => {
  const { 
    rosters, 
    loadingStates,
    refreshRosters 
  } = useDataCache();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<'all' | number>('all');
  const navigate = useNavigate();

  const handleCreateSuccess = () => {
    refreshRosters(); // Refresh cached rosters after successful creation
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const badgeByStatus: Record<string, string> = {
    published: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-800',
    default: 'bg-gray-100 text-gray-700'
  };

  const draftCount = rosters.filter(r => r.status === 'draft').length;
  const publishedCount = rosters.filter(r => r.status === 'published').length;

  const uniqueYears = Array.from(new Set(rosters.map(r => r.year))).sort((a, b) => a - b);

  const lastUpdated = rosters.reduce<string | null>((acc, r) => {
    const ts = (r as any).updated_at || (r as any).published_at || (r as any).created_at;
    if (!ts) return acc;
    const time = new Date(ts).getTime();
    if (!acc) return ts;
    return time > new Date(acc).getTime() ? ts : acc;
  }, null);

  const filteredRosters = rosters.filter(r => {
    const matchStatus = statusFilter === 'all' ? true : r.status === statusFilter;
    const matchYear = yearFilter === 'all' ? true : r.year === yearFilter;
    const monthYear = `${new Date(0, r.month - 1).toLocaleString('default', { month: 'long' })} ${r.year}`;
    const matchSearch = monthYear.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchYear && matchSearch;
  });

  return (
    <PageHeader
      title="Roster Management"
      subtitle="Create and manage work schedules and rosters"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Roster Management', href: '/rosters' }
      ]}
    >
      {/* Header Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#222E6A]" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Rosters</h2>
              <p className="text-gray-600 text-sm">{rosters.length} roster{rosters.length !== 1 ? 's' : ''} available</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-800 hover:bg-gray-50 transition-colors">
              <span>Print Schedule</span>
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-[#222E6A] hover:bg-[#1a2550] text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create New Roster
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm font-medium text-gray-800">
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Year</span>
            <select
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none"
              value={yearFilter === 'all' ? '' : yearFilter}
              onChange={(e) => setYearFilter(e.target.value === '' ? 'all' : parseInt(e.target.value))}
            >
              <option value="">All</option>
              {uniqueYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Draft Rosters</span>
            <span className="text-gray-900 font-semibold">{draftCount}</span>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Published Rosters</span>
            <span className="text-gray-900 font-semibold">{publishedCount}</span>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Last Update</span>
            <span className="text-gray-600 text-xs sm:text-sm">{lastUpdated ? new Date(lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <span>Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div className="flex-1 w-full">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="text"
              placeholder="Search month or year..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <button className="inline-flex sm:hidden items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-800 hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center">
            <span>Print Schedule</span>
          </button>
        </div>
      </div>

      {/* Rosters Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
        {loadingStates.rosters ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#454D7C] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading rosters...</p>
          </div>
        ) : filteredRosters.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-[#D8DAED] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="h-10 w-10 text-[#454D7C]" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Rosters Found</h3>
            <p className="text-gray-600 mb-6">Try adjusting filters or create a new roster.</p>
            <button
              onClick={openCreateModal}
              className="bg-[#222E6A] hover:bg-[#1a2550] text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-md hover:shadow-lg inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Roster
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRosters.map((roster) => {
              const label = `${new Date(0, roster.month - 1).toLocaleString('default', { month: 'long' })} ${roster.year}`;
              const badge = badgeByStatus[roster.status] || badgeByStatus.default;
              return (
                <div
                  key={roster.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${badge}`}>
                      {roster.status ? roster.status.charAt(0).toUpperCase() + roster.status.slice(1) : 'Draft'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 space-y-1 mb-4">
                    <p>Staffing Coverage: 100%</p>
                    <p>Last Edited: {(roster as any).updated_at ? new Date((roster as any).updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => navigate(`/rosters/${roster.id}`)}
                      className="text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-800 hover:bg-gray-50"
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/rosters/${roster.id}/edit`)}
                      className="text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-800 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button className="text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-800 hover:bg-gray-50">
                      Publish
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Create Roster Modal */}
      <CreateRosterModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSuccess={handleCreateSuccess}
      />
    </PageHeader>
  );
};

export default RostersPage;
