import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FileText, RefreshCw } from 'lucide-react';
import type { LeaveRequest } from '../types/leaveRequest';
import { leaveRequestService } from '../repository/leaveRequestService';
import { useAuth } from '../../auth/core/AuthContext';
import LeaveRequestApprovalModal from '../../../components/modals/roster/LeaveRequestApprovalModal';

const LEAVE_REQUEST_CREATED_EVENT = 'leave-request:create-optimistic';
const LEAVE_REQUEST_CONFIRMED_EVENT = 'leave-request:create-confirmed';
const LEAVE_REQUEST_ROLLED_BACK_EVENT = 'leave-request:create-rolled-back';

interface LeaveRequestsTableProps {
  statusFilter?: 'pending' | 'approved' | 'rejected' | 'all';
  refreshTrigger?: number;
  onRequestNew?: () => void;
}

const LeaveRequestsTable: React.FC<LeaveRequestsTableProps> = ({
  statusFilter = 'all',
  refreshTrigger,
  onRequestNew,
}) => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [optimisticRequests, setOptimisticRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>(statusFilter);

  const isManagerUser = useMemo(() => {
    const normalizedRole = String(user?.role || '').toLowerCase();
    return normalizedRole === 'manager teknik' || normalizedRole === 'general manager';
  }, [user?.role]);

  useEffect(() => {
    setLocalStatusFilter(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    const handleOptimisticCreate = (event: Event) => {
      const customEvent = event as CustomEvent<{ request: LeaveRequest }>;
      const request = customEvent.detail?.request;
      if (!request) return;

      setOptimisticRequests((prev) => [request, ...prev.filter((item) => item.id !== request.id)]);
    };

    const handleConfirmedCreate = (event: Event) => {
      const customEvent = event as CustomEvent<{ tempId: number; request: LeaveRequest }>;
      const tempId = customEvent.detail?.tempId;
      const request = customEvent.detail?.request;
      if (!request) return;

      setOptimisticRequests((prev) => prev.filter((item) => item.id !== tempId));
      setLeaveRequests((prev) => [request, ...prev.filter((item) => item.id !== request.id)]);
    };

    const handleRolledBackCreate = (event: Event) => {
      const customEvent = event as CustomEvent<{ tempId: number }>;
      const tempId = customEvent.detail?.tempId;
      if (typeof tempId !== 'number') return;

      setOptimisticRequests((prev) => prev.filter((item) => item.id !== tempId));
    };

    window.addEventListener(LEAVE_REQUEST_CREATED_EVENT, handleOptimisticCreate as EventListener);
    window.addEventListener(LEAVE_REQUEST_CONFIRMED_EVENT, handleConfirmedCreate as EventListener);
    window.addEventListener(LEAVE_REQUEST_ROLLED_BACK_EVENT, handleRolledBackCreate as EventListener);

    return () => {
      window.removeEventListener(LEAVE_REQUEST_CREATED_EVENT, handleOptimisticCreate as EventListener);
      window.removeEventListener(LEAVE_REQUEST_CONFIRMED_EVENT, handleConfirmedCreate as EventListener);
      window.removeEventListener(LEAVE_REQUEST_ROLLED_BACK_EVENT, handleRolledBackCreate as EventListener);
    };
  }, []);

  const fetchLeaveRequests = async () => {
    setIsLoading(true);
    try {
      const requestParams = {
        status: localStatusFilter === 'all' ? undefined : localStatusFilter,
        page: currentPage,
        per_page: itemsPerPage,
      };

      const response = isManagerUser
        ? await leaveRequestService.getLeaveRequests(requestParams)
        : await leaveRequestService.getMyLeaveRequests(requestParams);

      setLeaveRequests(response.data.data || []);
      setTotalPages(response.data.last_page || 1);
    } catch (error: any) {
      console.error('Failed to fetch leave requests:', error);
      const fallbackMessage = isManagerUser
        ? 'Gagal memuat data permohonan cuti'
        : 'Gagal memuat data pengajuan cuti Anda';
      toast.error(error?.response?.data?.message || fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchLeaveRequests();
  }, [localStatusFilter, currentPage, itemsPerPage, refreshTrigger, isManagerUser]);

  const handleViewDetail = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleApprovalSuccess = () => {
    void fetchLeaveRequests();
  };

  const handleCancelRequest = async (request: LeaveRequest) => {
    if (request.status !== 'pending') return;

    const confirmed = window.confirm('Apakah Anda yakin ingin membatalkan pengajuan cuti ini?');
    if (!confirmed) return;

    setCancellingId(request.id);

    try {
      await leaveRequestService.deleteLeaveRequest(request.id);
      toast.success('Pengajuan cuti berhasil dibatalkan');

      setLeaveRequests((prev) => prev.filter((item) => item.id !== request.id));
      setOptimisticRequests((prev) => prev.filter((item) => item.id !== request.id));
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Gagal membatalkan pengajuan cuti';
      toast.error(message);
    } finally {
      setCancellingId(null);
    }
  };

  const getLeaveTypeLabel = (request: LeaveRequest) => {
    if (request.request_type === 'doctor_leave') return 'Cuti Sakit';
    if (request.request_type === 'annual_leave') return 'Cuti Kepentingan';
    if (request.request_type === 'external_duty') {
      return request.institution ? `TPO - ${request.institution}` : 'TPO';
    }
    return request.request_type_name || '-';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'approved') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }

    if (status === 'rejected') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const visibleRequests = useMemo(() => {
    const serverById = new Map<number, LeaveRequest>();
    leaveRequests.forEach((request) => {
      serverById.set(request.id, request);
    });

    const optimisticOnly = optimisticRequests.filter((request) => !serverById.has(request.id));
    const merged = [...optimisticOnly, ...leaveRequests];

    return merged.filter((request) => {
      if (localStatusFilter === 'all') return true;
      return request.status === localStatusFilter;
    });
  }, [leaveRequests, optimisticRequests, localStatusFilter]);

  const filteredLeaveRequests = useMemo(() => {
    if (!searchQuery.trim()) return visibleRequests;

    const query = searchQuery.toLowerCase();
    return visibleRequests.filter((request) => {
      return (
        (request.employee?.user?.name || '').toLowerCase().includes(query) ||
        (request.employee?.user?.email || '').toLowerCase().includes(query) ||
        getLeaveTypeLabel(request).toLowerCase().includes(query) ||
        (request.status_name || '').toLowerCase().includes(query)
      );
    });
  }, [visibleRequests, searchQuery]);

  return (
    <>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-[#222E6A]">Pengajuan Cuti</h2>
        <p className="text-sm text-gray-600 mt-1">Kelola permintaan cuti karyawan pada periode roster aktif</p>
      </div>

      {onRequestNew && (
        <div className="mb-4 sm:mb-6 -mx-4 sm:mx-0 pl-0 sm:pl-0 flex gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={onRequestNew}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-br from-green-600 via-green-700 to-green-800 hover:from-green-700 hover:via-green-800 hover:to-green-900 rounded-xl transition-colors font-semibold text-white text-xs sm:text-sm shadow-md border border-gray-200"
          >
            <FileText className="h-4 w-4" />
            <span>Ajukan Cuti</span>
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 -mx-4 sm:mx-0 p-4 sm:p-6 lg:p-8">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Daftar Pengajuan Cuti</h3>
              <p className="text-xs sm:text-sm text-gray-600">Berikut adalah daftar pengajuan cuti beserta status persetujuannya</p>
            </div>
            <button
              onClick={() => void fetchLeaveRequests()}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="rounded-t-xl p-3 sm:p-6 bg-[#222E6A]">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="text-white text-xs sm:text-sm font-medium whitespace-nowrap">Per halaman</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium text-xs sm:text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-white text-xs sm:text-sm font-medium whitespace-nowrap hidden sm:inline">Status</span>
                <select
                  value={localStatusFilter}
                  onChange={(e) => {
                    setLocalStatusFilter(e.target.value as 'pending' | 'approved' | 'rejected' | 'all');
                    setCurrentPage(1);
                  }}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium text-xs sm:text-sm"
                >
                  <option value="all">Semua</option>
                  <option value="pending">Menunggu</option>
                  <option value="approved">Disetujui</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="Cari..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 text-xs sm:text-sm w-32 sm:w-auto"
              />
            </div>
          </div>
        </div>

        <div className="relative">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#222E6A]"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#454D7C]">
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">Karyawan</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">Jenis Cuti</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">Periode</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">Total Hari</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">Status</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">Tanggal Pengajuan</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 sm:px-6 py-6 sm:py-8 text-center text-gray-500 text-sm">
                        Tidak ada pengajuan cuti
                      </td>
                    </tr>
                  ) : (
                    filteredLeaveRequests.map((request) => (
                      <tr key={request.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                          <div>
                            <p className="font-medium">{request.employee?.user?.name || '-'}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">{request.employee?.user?.email || '-'}</p>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">{getLeaveTypeLabel(request)}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">{request.total_days} hari</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                            {getStatusIcon(request.status)}
                            {request.status_name}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">{formatDate(request.created_at)}</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleViewDetail(request)}
                              className="px-2 py-1 bg-[#222E6A] text-white text-xs rounded-lg hover:bg-[#1a2550] transition-colors"
                            >
                              {request.status === 'pending' ? 'Proses' : 'Detail'}
                            </button>

                            {request.status === 'pending' && (
                              <button
                                onClick={() => void handleCancelRequest(request)}
                                disabled={cancellingId === request.id}
                                className="px-2 py-1 border border-red-300 text-red-600 text-xs rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {cancellingId === request.id ? 'Membatalkan...' : 'Batalkan'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="sm:hidden flex items-center justify-center py-2 bg-gray-50 border-t border-gray-200">
            <svg className="w-4 h-4 text-gray-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <span className="ml-2 text-xs text-gray-500 font-medium">Geser untuk melihat lebih</span>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-700">Halaman {currentPage} dari {totalPages}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      <LeaveRequestApprovalModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        leaveRequest={selectedRequest}
        onSuccess={handleApprovalSuccess}
      />
    </>
  );
};

export default LeaveRequestsTable;
