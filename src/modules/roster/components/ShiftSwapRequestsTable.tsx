/**
 * ShiftSwapRequestsTable Component
 * 
 * Table displaying shift swap requests with real API integration and actions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { flushSync } from 'react-dom';
import { shiftRequestService, type ShiftRequestItem } from '../repository/shiftRequestService';
import { useAuth } from '../../auth/core/AuthContext';
import { Check, X, Loader2, RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

interface ShiftSwapRequestsTableProps {
  onRequestNew?: () => void;
  rosterId?: number;
}

const SHIFT_SWAP_REQUEST_CREATED_EVENT = 'shift-swap-request:create-optimistic';
const SHIFT_SWAP_REQUEST_CONFIRMED_EVENT = 'shift-swap-request:create-confirmed';
const SHIFT_SWAP_REQUEST_ROLLED_BACK_EVENT = 'shift-swap-request:create-rolled-back';
const waitForNextPaint = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

const ShiftSwapRequestsTable: React.FC<ShiftSwapRequestsTableProps> = ({
  onRequestNew,
  rosterId,
}) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ShiftRequestItem[]>([]);
  const [optimisticRequests, setOptimisticRequests] = useState<ShiftRequestItem[]>([]);
  const [optimisticUpdatesById, setOptimisticUpdatesById] = useState<Record<number, Partial<ShiftRequestItem>>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingActionById, setPendingActionById] = useState<Record<number, string>>({});
  const [managerStatus, setManagerStatus] = useState<{ is_role_manager: boolean; has_manager_duties: boolean; is_manager: boolean } | null>(null);
  const [checkingManagerStatus, setCheckingManagerStatus] = useState(true);

  // Check manager status including temporary duties
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await shiftRequestService.checkManagerStatus(
          rosterId ? { roster_period_id: rosterId } : undefined
        );
        setManagerStatus(result.data);
      } catch (error) {
        console.error('Failed to check manager status:', error);
        // Fallback to role-based check
        const roleBasedCheck = user?.role === 'Manager Teknik' || user?.role === 'General Manager';
        setManagerStatus({ is_role_manager: roleBasedCheck, has_manager_duties: false, is_manager: roleBasedCheck });
      } finally {
        setCheckingManagerStatus(false);
      }
    };
    checkStatus();
  }, [rosterId, user?.role]);

  const isManager = managerStatus?.is_manager || false;
  const isAdmin = user?.role === 'Admin';

  const loadRequests = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const params: any = {
        per_page: itemsPerPage,
        page: currentPage,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (rosterId) {
        params.roster_period_id = rosterId;
      }
      
      const response = await shiftRequestService.getShiftRequests(params);
      setRequests(response.data || []);
      setTotalPages(response.meta?.last_page || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to load shift requests:', error);
      if (!silent) {
        toast.error('Gagal memuat data permintaan tukar shift');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [itemsPerPage, currentPage, statusFilter, rosterId]);

  useEffect(() => {
    // Wait for manager status check to complete before loading requests
    if (!checkingManagerStatus) {
      loadRequests();
    }
  }, [loadRequests, checkingManagerStatus]);

  useEffect(() => {
    const handleOptimisticCreate = (event: Event) => {
      const customEvent = event as CustomEvent<{ request: ShiftRequestItem }>;
      const request = customEvent.detail?.request;
      if (!request) return;

      setOptimisticRequests((prev) => [request, ...prev.filter((item) => item.id !== request.id)]);
    };

    const handleConfirmedCreate = (event: Event) => {
      const customEvent = event as CustomEvent<{ tempId: number; request: ShiftRequestItem }>;
      const tempId = customEvent.detail?.tempId;
      const request = customEvent.detail?.request;
      if (!request) return;

      setOptimisticRequests((prev) => prev.filter((item) => item.id !== tempId));
      setRequests((prev) => [request, ...prev.filter((item) => item.id !== request.id)]);
    };

    const handleRolledBackCreate = (event: Event) => {
      const customEvent = event as CustomEvent<{ tempId: number }>;
      const tempId = customEvent.detail?.tempId;
      if (typeof tempId !== 'number') return;

      setOptimisticRequests((prev) => prev.filter((item) => item.id !== tempId));
    };

    window.addEventListener(SHIFT_SWAP_REQUEST_CREATED_EVENT, handleOptimisticCreate as EventListener);
    window.addEventListener(SHIFT_SWAP_REQUEST_CONFIRMED_EVENT, handleConfirmedCreate as EventListener);
    window.addEventListener(SHIFT_SWAP_REQUEST_ROLLED_BACK_EVENT, handleRolledBackCreate as EventListener);

    return () => {
      window.removeEventListener(SHIFT_SWAP_REQUEST_CREATED_EVENT, handleOptimisticCreate as EventListener);
      window.removeEventListener(SHIFT_SWAP_REQUEST_CONFIRMED_EVENT, handleConfirmedCreate as EventListener);
      window.removeEventListener(SHIFT_SWAP_REQUEST_ROLLED_BACK_EVENT, handleRolledBackCreate as EventListener);
    };
  }, []);

  const handleApproveTarget = async (id: number) => {
    flushSync(() => {
      setActionLoading(id);
      setPendingActionById((prev) => ({ ...prev, [id]: 'Menyetujui...' }));
      setOptimisticUpdatesById((prev) => ({
        ...prev,
        [id]: {
          approved_by_target: true,
          current_user_already_approved: true,
          current_user_can_approve_as_target: false,
        }
      }));
    });

    try {
      await waitForNextPaint();
      await shiftRequestService.approveAsTarget(id);
      toast.success('Permintaan berhasil disetujui');
      await loadRequests(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menyetujui permintaan');
    } finally {
      setActionLoading(null);
      setOptimisticUpdatesById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setPendingActionById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleApproveManager = async (id: number) => {
    flushSync(() => {
      setActionLoading(id);
      setPendingActionById((prev) => ({ ...prev, [id]: 'Mengapprove...' }));
      setOptimisticUpdatesById((prev) => ({
        ...prev,
        [id]: {
          current_user_already_approved: true,
          current_user_can_approve_as_manager: false,
        }
      }));
    });

    try {
      await waitForNextPaint();
      await shiftRequestService.approveAsManager(id);
      toast.success('Permintaan berhasil diapprove');
      await loadRequests(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal approve permintaan');
    } finally {
      setActionLoading(null);
      setOptimisticUpdatesById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setPendingActionById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    
    const id = rejectingId;

    flushSync(() => {
      setActionLoading(rejectingId);
      setPendingActionById((prev) => ({ ...prev, [id]: 'Menolak...' }));
      setOptimisticUpdatesById((prev) => ({
        ...prev,
        [id]: {
          status: 'rejected',
          rejection_reason: rejectReason || null,
          current_user_can_approve_as_target: false,
          current_user_can_approve_as_manager: false,
        }
      }));
    });

    try {
      await waitForNextPaint();
      await shiftRequestService.rejectRequest(id, { reason: rejectReason || undefined });
      toast.success('Permintaan berhasil ditolak');
      setShowRejectModal(false);
      setRejectingId(null);
      setRejectReason('');
      await loadRequests(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menolak permintaan');
    } finally {
      setActionLoading(null);
      setOptimisticUpdatesById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setPendingActionById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan permintaan ini?')) return;
    
    flushSync(() => {
      setActionLoading(id);
      setPendingActionById((prev) => ({ ...prev, [id]: 'Membatalkan...' }));
      setOptimisticUpdatesById((prev) => ({
        ...prev,
        [id]: {
          status: 'cancelled',
          current_user_can_approve_as_target: false,
          current_user_can_approve_as_manager: false,
        }
      }));
    });

    try {
      await waitForNextPaint();
      await shiftRequestService.cancelRequest(id);
      toast.success('Permintaan berhasil dibatalkan');
      await loadRequests(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal membatalkan permintaan');
    } finally {
      setActionLoading(null);
      setOptimisticUpdatesById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setPendingActionById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Disetujui' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Selesai' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Ditolak' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Dibatalkan' },
    };
    
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getPendingActionLabel = (id: number) => {
    return pendingActionById[id];
  };

  const getApprovalStatus = (request: ShiftRequestItem) => {
    if (request.status !== 'pending') return null;
    
    // Check if current user is the target who already approved
    const isCurrentUserTarget = user?.employee?.id === request.target_employee_id;
    // Use backend value for accurate "already approved" status
    const currentUserAlreadyApproved = request.current_user_already_approved === true;
    const normalize = (value: string | undefined | null) => (value || '').trim().toLowerCase();
    const requesterType = normalize(request.requester_employee?.employee_type);
    const targetType = normalize(request.target_employee?.employee_type);
    const isM2MByType = requesterType === 'manager teknik' && targetType === 'manager teknik';
    const isM2M = request.is_manager_to_manager === true || isM2MByType;

    // For manager-to-manager swaps: GM approves both manager slots at once
    // Show: Target + General Manager
    // For regular swaps: show Target + Mgr 1 + Mgr 2
    const items = isM2M
      ? [
          {
            label: 'Target',
            done: request.approved_by_target,
            highlight: isCurrentUserTarget && request.approved_by_target,
          },
          {
            label: 'General Manager',
            done: request.approved_by_from_manager && request.approved_by_to_manager,
            highlight: currentUserAlreadyApproved && request.approved_by_from_manager && request.approved_by_to_manager && !isCurrentUserTarget,
          },
        ]
      : [
          {
            label: 'Target',
            done: request.approved_by_target,
            highlight: isCurrentUserTarget && request.approved_by_target,
          },
          {
            label: 'Mgr 1',
            done: request.approved_by_from_manager,
            highlight: currentUserAlreadyApproved && request.approved_by_from_manager && !isCurrentUserTarget,
          },
          {
            label: 'Mgr 2',
            done: request.approved_by_to_manager,
            highlight: currentUserAlreadyApproved && request.approved_by_to_manager && !isCurrentUserTarget,
          },
        ];
    
    return (
      <div className="flex flex-col gap-1 mt-1">
        <div className="flex items-center gap-1">
          {items.map((item, idx) => (
            <span 
              key={idx}
              className={`text-[9px] px-1 py-0.5 rounded ${
                item.done 
                  ? item.highlight 
                    ? 'bg-blue-100 text-blue-700 font-semibold' 
                    : 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {item.label} {item.highlight && item.done && '✓'}
            </span>
          ))}
        </div>
        {/* Show indicator if current user has already approved */}
        {currentUserAlreadyApproved && (
          <span className="text-[9px] text-blue-600 font-medium">Anda sudah approve</span>
        )}
        {(isM2M
          ? request.approved_by_from_manager && request.approved_by_to_manager && request.approved_by_target
          : request.approved_by_from_manager && request.approved_by_to_manager
        ) && (
          <span className="text-[9px] text-green-600 font-medium">Semua sudah approve</span>
        )}
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Map notes to display name
  const getShiftDisplayName = (notes: string | undefined | null) => {
    if (!notes) return '-';
    const notesUpper = notes.toUpperCase().trim();
    const shiftMap: Record<string, string> = {
      'P': 'Pagi',
      'S': 'Siang',
      'M': 'Malam',
      'L': 'Libur',
      'L1': 'Libur',
      'L2': 'Libur',
      'CT': 'Cuti Tahunan',
      'CS': 'Cuti Sakit',
      'DL': 'Dinas Luar',
      'TB': 'Tugas Belajar',
      'OFF': 'Off',
    };
    return shiftMap[notesUpper] || notes;
  };

  const canApproveAsTarget = (request: ShiftRequestItem) => {
    // Use backend-computed value if available
    if (request.current_user_can_approve_as_target !== undefined) {
      return request.current_user_can_approve_as_target;
    }
    // Fallback to old logic
    return request.status === 'pending' && 
           !request.approved_by_target && 
           user?.employee?.id === request.target_employee_id;
  };

  const canApproveAsManager = (request: ShiftRequestItem) => {
    // Backend is the single source of truth for manager approval eligibility.
    return request.current_user_can_approve_as_manager === true;
  };

  const canReject = (request: ShiftRequestItem) => {
    if (request.status !== 'pending') return false;
    
    // Target can reject before approving
    if (user?.employee?.id === request.target_employee_id && !request.approved_by_target) {
      return true;
    }
    
    // Manager can reject only when backend marks current user as approver for this request.
    if ((isManager || isAdmin) && request.approved_by_target) {
      return request.current_user_can_approve_as_manager === true;
    }
    
    return false;
  };

  const canCancel = (request: ShiftRequestItem) => {
    return request.status === 'pending' && 
           user?.employee?.id === request.requester_employee_id;
  };

  const visibleRequests = useMemo(() => {
    const patchedRequests = requests.map((request) => ({
      ...request,
      ...(optimisticUpdatesById[request.id] || {}),
    }));

    const tempOnlyRequests = optimisticRequests.filter(
      (request) => !patchedRequests.some((serverRequest) => serverRequest.id === request.id)
    );

    return [...tempOnlyRequests, ...patchedRequests];
  }, [requests, optimisticRequests, optimisticUpdatesById]);

  // Filter based on search
  const filteredRequests = visibleRequests.filter(req => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      req.requester_employee?.user?.name?.toLowerCase().includes(search) ||
      req.target_employee?.user?.name?.toLowerCase().includes(search) ||
      req.requester_notes?.toLowerCase().includes(search) ||
      req.target_notes?.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      {/* Title */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-[#222E6A]">Permintaan Tukar Shift</h2>
        <p className="text-sm text-gray-600 mt-1">Kelola permintaan tukar shift pada periode roster aktif</p>
      </div>

      {/* Request Buttons */}
      {onRequestNew && (
        <div className="mb-4 sm:mb-6 -mx-4 sm:mx-0 pl-0 sm:pl-0 flex gap-2 sm:gap-3 flex-wrap">
          {onRequestNew && (
            <button 
              onClick={onRequestNew}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-br from-[#222E6A] via-[#2a3a7f] to-[#1a235c] hover:from-[#1a235c] hover:via-[#222E6A] hover:to-[#2a3a7f] rounded-xl transition-colors font-semibold text-white text-xs sm:text-sm shadow-md border border-gray-200"
            >
              <span className="text-lg sm:text-xl">+</span>
              <span>Ajukan Tukar Shift</span>
            </button>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 -mx-4 sm:mx-0 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Daftar Permintaan Tukar Shift</h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Berikut adalah daftar permintaan yang diajukan dan status verifikasinya
              </p>
            </div>
            <button
              onClick={() => loadRequests()}
              disabled={loading}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter and Search */}
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
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium text-xs sm:text-sm"
                >
                  <option value="">Semua</option>
                  <option value="pending">Menunggu</option>
                  <option value="approved">Disetujui</option>
                  <option value="completed">Selesai</option>
                  <option value="rejected">Ditolak</option>
                  <option value="cancelled">Dibatalkan</option>
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

        {/* Table */}
        <div className="relative">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-[#222E6A] animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#454D7C]">
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                      Pemohon
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                      Shift Asal
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                      Rekan Approver
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                      Shift Tujuan
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                      Tanggal
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 sm:px-6 py-6 sm:py-8 text-center text-gray-500 text-sm">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        Tidak ada permintaan tukar shift
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (
                      <tr key={request.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                          <div>
                            <p className="font-medium">{request.requester_employee?.user?.name || '-'}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">{request.requester_employee?.employee_type}</p>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          <div>
                            <p className="font-medium">{getShiftDisplayName(request.requester_notes)}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              {request.from_roster_day?.work_date ? formatDate(request.from_roster_day.work_date) : '-'}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                          <div>
                            <p className="font-medium">{request.target_employee?.user?.name || '-'}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">{request.target_employee?.employee_type}</p>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          <div>
                            <p className="font-medium">{getShiftDisplayName(request.target_notes)}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              {request.to_roster_day?.work_date ? formatDate(request.to_roster_day.work_date) : '-'}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {formatDate(request.created_at)}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                          <div>
                            {getStatusBadge(request.status)}
                            {getPendingActionLabel(request.id) && (
                              <p className="mt-1 text-[10px] sm:text-xs text-amber-600 font-medium">
                                {getPendingActionLabel(request.id)}
                              </p>
                            )}
                            {getApprovalStatus(request)}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                          <div className="flex items-center gap-1">
                            {canApproveAsTarget(request) && (
                              <button
                                onClick={() => handleApproveTarget(request.id)}
                                disabled={actionLoading === request.id}
                                className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                                title="Setuju"
                              >
                                {actionLoading === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            {canApproveAsManager(request) && (
                              <button
                                onClick={() => handleApproveManager(request.id)}
                                disabled={actionLoading === request.id}
                                className="px-2 py-1 bg-[#222E6A] text-white text-xs rounded-lg hover:bg-[#1a2550] transition-colors"
                                title="Approve Manager"
                              >
                                {actionLoading === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Approve'
                                )}
                              </button>
                            )}
                            {canReject(request) && (
                              <button
                                onClick={() => {
                                  setRejectingId(request.id);
                                  setShowRejectModal(true);
                                }}
                                disabled={actionLoading === request.id}
                                className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
                                title="Tolak"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                            {canCancel(request) && (
                              <button
                                onClick={() => handleCancel(request.id)}
                                disabled={actionLoading === request.id}
                                className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Batalkan"
                              >
                                Batal
                              </button>
                            )}
                            {request.status !== 'pending' && (
                              <span className="text-gray-400 text-xs">-</span>
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
          
          {/* Mobile Scroll Indicator */}
          <div className="sm:hidden flex items-center justify-center py-2 bg-gray-50 border-t border-gray-200">
            <svg className="w-4 h-4 text-gray-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <span className="ml-2 text-xs text-gray-500 font-medium">Geser untuk melihat lebih</span>
          </div>
        </div>

        {/* Pagination */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs sm:text-sm text-gray-600">
            Menampilkan {filteredRequests.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems}
          </span>
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <span className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#222E6A] text-white rounded-lg font-medium text-xs sm:text-sm">
              {currentPage}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tolak Permintaan</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Masukkan alasan penolakan (opsional)..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#222E6A] focus:border-transparent resize-none"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading === rejectingId}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                >
                  {actionLoading === rejectingId && <Loader2 className="h-4 w-4 animate-spin" />}
                  Tolak Permintaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftSwapRequestsTable;
