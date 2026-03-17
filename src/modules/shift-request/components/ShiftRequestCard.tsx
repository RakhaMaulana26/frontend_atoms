import React, { useState } from 'react';
import { 
  Calendar, Clock, ArrowRightLeft, Check, X, 
  AlertCircle, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import type { ShiftRequest } from '../../../types';
import { useAuth } from '../../auth/core/AuthContext';

interface ShiftRequestCardProps {
  request: ShiftRequest;
  onApproveTarget: (id: number) => Promise<void>;
  onApproveManager: (id: number) => Promise<void>;
  onReject: (id: number, reason?: string) => Promise<void>;
  onCancel: (id: number) => Promise<void>;
  onRefresh: () => void;
}

const ShiftRequestCard: React.FC<ShiftRequestCardProps> = ({
  request,
  onApproveTarget,
  onApproveManager,
  onReject,
  onCancel,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isRequester = user?.employee?.id === request.requester_employee_id;
  const isTarget = user?.employee?.id === request.target_employee_id;
  const isManager = user?.role === 'Manager Teknik' || user?.role === 'General Manager';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
      weekday: 'short', 
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

  const getStatusBadge = () => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Disetujui' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Selesai' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Ditolak' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Dibatalkan' },
    };
    
    const badge = badges[request.status] || badges.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getApprovalProgress = () => {
    if (request.status !== 'pending') return null;

    const steps = [
      { label: 'Target', approved: request.approved_by_target },
      { label: 'Manager From', approved: request.approved_by_from_manager },
      { label: 'Manager To', approved: request.approved_by_to_manager },
    ];

    return (
      <div className="flex items-center gap-2 mt-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className={`flex items-center gap-1 text-xs ${
              step.approved ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                step.approved ? 'bg-green-500' : 'bg-gray-200'
              }`}>
                {step.approved && <Check className="h-3 w-3 text-white" />}
              </div>
              <span>{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-4 h-0.5 ${step.approved ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(request.id, rejectReason || undefined);
      setShowRejectModal(false);
      setRejectReason('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Determine what actions the current user can take
  const canApproveAsTarget = isTarget && request.status === 'pending' && !request.approved_by_target;
  const canApproveAsManager = isManager && request.status === 'pending' && request.approved_by_target;
  const canReject = (isTarget && !request.approved_by_target) || (isManager && request.approved_by_target);
  const canCancel = isRequester && request.status === 'pending';

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#D8DAED] p-2 rounded-lg">
                <ArrowRightLeft className="h-5 w-5 text-[#454D7C]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {request.requester_employee?.user?.name || 'Unknown'}
                  </span>
                  <ArrowRightLeft className="h-3 w-3 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {request.target_employee?.user?.name || 'Unknown'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  #{request.id} • {new Date(request.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Shift Info */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* From (Requester's shift) */}
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-red-600 font-medium mb-2">Shift Pemohon</p>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-red-400" />
                <span className="text-gray-900">
                  {request.from_roster_day?.work_date ? formatDate(request.from_roster_day.work_date) : '-'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Clock className="h-4 w-4 text-red-400" />
                <span className="text-gray-700">{getShiftDisplayName(request.requester_notes)}</span>
              </div>
            </div>

            {/* To (Target's shift) */}
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium mb-2">Shift Target</p>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-green-400" />
                <span className="text-gray-900">
                  {request.to_roster_day?.work_date ? formatDate(request.to_roster_day.work_date) : '-'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Clock className="h-4 w-4 text-green-400" />
                <span className="text-gray-700">{getShiftDisplayName(request.target_notes)}</span>
              </div>
            </div>
          </div>

          {/* Approval Progress (for pending) */}
          {getApprovalProgress()}

          {/* Reason if rejected */}
          {request.status === 'rejected' && request.rejection_reason && (
            <div className="mt-3 p-2 bg-red-50 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <p className="text-sm text-red-700">{request.rejection_reason}</p>
            </div>
          )}

          {/* Expand button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-sm text-[#222E6A] hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Sembunyikan detail
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Lihat detail
              </>
            )}
          </button>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="px-4 pb-4 pt-0 border-t border-gray-100">
            <div className="mt-3 space-y-2 text-sm">
              {request.reason && (
                <div>
                  <p className="text-gray-500">Alasan:</p>
                  <p className="text-gray-900">{request.reason}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500">Pemohon:</p>
                  <p className="text-gray-900">{request.requester_employee?.user?.name}</p>
                  <p className="text-xs text-gray-500">{request.requester_employee?.employee_type}</p>
                </div>
                <div>
                  <p className="text-gray-500">Target:</p>
                  <p className="text-gray-900">{request.target_employee?.user?.name}</p>
                  <p className="text-xs text-gray-500">{request.target_employee?.employee_type}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {request.status === 'pending' && (canApproveAsTarget || canApproveAsManager || canReject || canCancel) && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
            {canCancel && (
              <button
                onClick={() => handleAction(() => onCancel(request.id))}
                disabled={loading}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Batalkan
              </button>
            )}
            {canReject && (
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={loading}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Tolak
              </button>
            )}
            {canApproveAsTarget && (
              <button
                onClick={() => handleAction(() => onApproveTarget(request.id))}
                disabled={loading}
                className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Setuju
              </button>
            )}
            {canApproveAsManager && (
              <button
                onClick={() => handleAction(() => onApproveManager(request.id))}
                disabled={loading}
                className="px-4 py-1.5 bg-[#222E6A] text-white text-sm rounded-lg hover:bg-[#1a2550] transition-colors flex items-center gap-1"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Approve (Manager)
              </button>
            )}
          </div>
        )}
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
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Tolak Permintaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShiftRequestCard;
