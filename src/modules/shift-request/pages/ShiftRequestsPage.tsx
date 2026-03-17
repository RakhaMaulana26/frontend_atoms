import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Breadcrumbs } from '../../../components';
import { RefreshCw, Plus, Bell, User, Filter, Loader2, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../../auth/core/AuthContext';
import { shiftRequestService } from '../repository/shiftRequestService';
import { CreateSwapRequestModal, ShiftRequestCard } from '../components';
import type { ShiftRequest, ShiftRequestStatus, ShiftRequestPendingCount } from '../../../types';

type FilterType = 'all' | 'pending' | 'my_requests' | 'pending_approval';

const ShiftRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState<ShiftRequestPendingCount | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<ShiftRequestStatus | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  const isManager = user?.role === 'Manager Teknik' || user?.role === 'General Manager';
  const isAdmin = user?.role === 'Admin';

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      if (filter === 'my_requests') {
        params.type = 'my_requests';
      } else if (filter === 'pending_approval' && isManager) {
        params.type = 'pending_approval';
      } else if (filter === 'pending') {
        params.status = 'pending';
      }
      
      const response = await shiftRequestService.getShiftRequests(params);
      setRequests(response.data);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, statusFilter, isManager]);

  const loadPendingCount = useCallback(async () => {
    try {
      const response = await shiftRequestService.getPendingCount();
      setPendingCount(response);
    } catch (err) {
      console.error('Failed to load pending count:', err);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    loadPendingCount();
  }, [loadRequests, loadPendingCount]);

  const handleApproveTarget = async (id: number) => {
    await shiftRequestService.approveAsTarget(id);
  };

  const handleApproveManager = async (id: number) => {
    await shiftRequestService.approveAsManager(id);
  };

  const handleReject = async (id: number, reason?: string) => {
    await shiftRequestService.rejectRequest(id, { reason });
  };

  const handleCancel = async (id: number) => {
    await shiftRequestService.cancelRequest(id);
  };

  const handleRefresh = () => {
    loadRequests();
    loadPendingCount();
  };

  const filterTabs: { key: FilterType; label: string; badge?: number }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'my_requests', label: 'Permintaan Saya', badge: pendingCount?.counts.my_pending },
  ];

  if (isManager || isAdmin) {
    filterTabs.push({ 
      key: 'pending_approval', 
      label: 'Perlu Approval', 
      badge: (pendingCount?.counts.as_manager || 0) + (pendingCount?.counts.as_target || 0) 
    });
  }

  // Add pending badge for target approval
  if (pendingCount?.counts.as_target && pendingCount.counts.as_target > 0) {
    const existingPending = filterTabs.find(t => t.key === 'pending');
    if (!existingPending) {
      filterTabs.splice(1, 0, { 
        key: 'pending', 
        label: 'Menunggu Persetujuan', 
        badge: pendingCount.counts.as_target 
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs items={[{ label: 'Tukar Shift' }]} />
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => navigate('/notifications')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors relative"
              >
                <Bell className="h-5 w-5" />
                {pendingCount && pendingCount.total > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {pendingCount.total}
                  </span>
                )}
              </button>
              <button 
                onClick={() => navigate('/home')}
                className="flex items-center space-x-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
              >
                <User className="h-5 w-5" />
                <span className="text-sm hidden sm:inline">{user?.name}</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <ArrowRightLeft className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Tukar Shift</h1>
                <p className="text-sm opacity-90">Ajukan dan kelola permintaan tukar shift</p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-[#222E6A] hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tukar Shift
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 inline-flex gap-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                filter === tab.key
                  ? 'bg-[#222E6A] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  filter === tab.key ? 'bg-white/20' : 'bg-red-100 text-red-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ShiftRequestStatus | '')}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="completed">Selesai</option>
            <option value="rejected">Ditolak</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
          
          <button
            onClick={handleRefresh}
            className="ml-auto p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 text-[#222E6A] animate-spin" />
            <p className="mt-3 text-gray-500">Memuat data...</p>
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="bg-[#D8DAED] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ArrowRightLeft className="h-10 w-10 text-[#454D7C]" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak Ada Permintaan</h3>
              <p className="text-gray-600 mb-6">
                {filter === 'my_requests' 
                  ? 'Anda belum memiliki permintaan tukar shift'
                  : filter === 'pending_approval'
                    ? 'Tidak ada permintaan yang memerlukan approval Anda'
                    : 'Belum ada permintaan tukar shift'
                }
              </p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-[#222E6A] hover:bg-[#1a2550] text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-md hover:shadow-lg inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Buat Permintaan Baru
              </button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <ShiftRequestCard
                key={request.id}
                request={request}
                onApproveTarget={handleApproveTarget}
                onApproveManager={handleApproveManager}
                onReject={handleReject}
                onCancel={handleCancel}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateSwapRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
};

export default ShiftRequestsPage;
