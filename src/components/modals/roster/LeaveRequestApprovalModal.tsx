import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from '../../common/Modal';
import Button from '../../ui/Button';
import type { LeaveRequest, LeaveRequestDateApproval } from '../../../modules/roster/types/leaveRequest';
import { leaveRequestService } from '../../../modules/roster/repository/leaveRequestService';
import { useDataCache } from '../../../contexts/DataCacheContext';

interface LeaveRequestApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequest: LeaveRequest | null;
  onSuccess: (updatedLeaveRequest: LeaveRequest) => void;
}

const statusBadgeClassMap: Record<'pending' | 'approved' | 'rejected', string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-700',
};

const LeaveRequestApprovalModal: React.FC<LeaveRequestApprovalModalProps> = ({
  isOpen,
  onClose,
  leaveRequest,
  onSuccess,
}) => {
  const { applyApprovedLeaveToRosterCache } = useDataCache();
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isOpeningDocument, setIsOpeningDocument] = useState(false);
  const [isDownloadingDocument, setIsDownloadingDocument] = useState(false);
  const [detailLeaveRequest, setDetailLeaveRequest] = useState<LeaveRequest | null>(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  useEffect(() => {
    if (!isOpen || !leaveRequest) {
      setDetailLeaveRequest(null);
      setApprovalNotes('');
      setActionType(null);
      setIsFetchingDetail(false);
      return;
    }

    let isCancelled = false;

    setDetailLeaveRequest(leaveRequest);
    setIsFetchingDetail(true);

    leaveRequestService.getLeaveRequestById(leaveRequest.id)
      .then((response) => {
        if (!isCancelled) {
          setDetailLeaveRequest(response.data);
        }
      })
      .catch((error: any) => {
        if (!isCancelled) {
          console.error('Failed to fetch leave request detail:', error);
          toast.error(error.response?.data?.message || 'Gagal memuat detail permohonan cuti');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsFetchingDetail(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, leaveRequest]);

  const activeLeaveRequest = detailLeaveRequest ?? leaveRequest;

  const hasDocument = useMemo(() => {
    if (!activeLeaveRequest) return false;

    return Boolean(
      activeLeaveRequest.document_url ||
      activeLeaveRequest.document_path ||
      activeLeaveRequest.document_original_name ||
      activeLeaveRequest.document_mime_type
    );
  }, [activeLeaveRequest]);

  const approvalDates = activeLeaveRequest?.approval_dates ?? [];
  const currentUserPendingDates = activeLeaveRequest?.current_user_pending_approval_dates ?? [];
  const canTakeAction = activeLeaveRequest?.status === 'pending' && activeLeaveRequest.current_user_can_approve === true;

  const handleApprove = () => {
    setActionType('approve');
  };

  const handleReject = () => {
    setActionType('reject');
  };

  const handleSubmit = async () => {
    if (!activeLeaveRequest || !actionType) return;

    if (actionType === 'reject' && !approvalNotes.trim()) {
      toast.error('Catatan penolakan wajib diisi');
      return;
    }

    setIsLoading(true);
    try {
      const response = await leaveRequestService.updateLeaveRequestStatus(activeLeaveRequest.id, {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        approval_notes: approvalNotes.trim() || undefined,
      });

      setDetailLeaveRequest(response.data);
      applyApprovedLeaveToRosterCache(response.data);
      toast.success(response.message || (actionType === 'approve'
        ? 'Permohonan cuti berhasil diproses.'
        : 'Permohonan cuti berhasil ditolak.'));

      setApprovalNotes('');
      setActionType(null);
      onSuccess(response.data);
      onClose();
    } catch (error: any) {
      console.error('Failed to update leave request status:', error);
      toast.error(error.response?.data?.message || 'Gagal memproses permohonan cuti');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setActionType(null);
    setApprovalNotes('');
  };

  const openBlobInNewTab = (blob: Blob) => {
    const blobUrl = URL.createObjectURL(blob);
    const previewWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);

    return Boolean(previewWindow);
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleViewDocument = async () => {
    if (!activeLeaveRequest) return;

    setIsOpeningDocument(true);
    try {
      const { blob, filename } = await leaveRequestService.getLeaveRequestDocumentBlob(activeLeaveRequest.id);
      const opened = openBlobInNewTab(blob);

      if (!opened) {
        triggerBlobDownload(blob, filename);
        toast.info('Popup diblokir browser, file didownload otomatis.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal membuka dokumen pendukung');
    } finally {
      setIsOpeningDocument(false);
    }
  };

  const handleDownloadDocument = async () => {
    if (!activeLeaveRequest) return;

    setIsDownloadingDocument(true);
    try {
      const { blob, filename } = await leaveRequestService.getLeaveRequestDocumentBlob(activeLeaveRequest.id);
      triggerBlobDownload(blob, filename);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mendownload dokumen pendukung');
    } finally {
      setIsDownloadingDocument(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';

    return new Date(value).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getLeaveTypeLabel = () => {
    if (!activeLeaveRequest) return '-';

    if (activeLeaveRequest.request_type === 'doctor_leave') {
      return 'Cuti Sakit';
    }

    if (activeLeaveRequest.request_type === 'annual_leave') {
      return 'Cuti Kepentingan';
    }

    if (activeLeaveRequest.request_type === 'external_duty') {
      return activeLeaveRequest.institution ? `TPO - ${activeLeaveRequest.institution}` : 'TPO';
    }

    return activeLeaveRequest.request_type_name;
  };

  const getApprovalBadgeClass = (approval: LeaveRequestDateApproval) => {
    if (approval.needs_assignment) {
      return 'bg-amber-100 text-amber-800';
    }

    return statusBadgeClassMap[approval.status] || 'bg-gray-100 text-gray-800';
  };

  if (!activeLeaveRequest) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={actionType ? 'Konfirmasi Keputusan' : 'Detail Permohonan Cuti'}
      size="lg"
      headerClassName="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white"
    >
      <div className="space-y-4 sm:space-y-6">
        {isFetchingDetail && (
          <div className="flex items-center gap-2 rounded-lg border border-[#D8DAED] bg-[#F3F4FB] px-3 py-2 text-sm text-[#222E6A]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C7CAE6] border-t-[#222E6A]" />
            Memuat detail approval per tanggal...
          </div>
        )}

        <div className="bg-[#F7F8FE] border border-[#D8DAED] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#222E6A] mb-3">Informasi Karyawan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-xs text-gray-500">Nama</p>
              <p className="text-sm font-medium text-[#111827] break-words">{activeLeaveRequest.employee?.user?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-[#111827] break-all">{activeLeaveRequest.employee?.user?.email}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#D8DAED] rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <p className="text-xs text-gray-500">Jenis Cuti</p>
              <p className="text-sm font-semibold text-[#222E6A]">{getLeaveTypeLabel()}</p>
            </div>
            <span className={`self-start px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClassMap[activeLeaveRequest.status]}`}>
              {activeLeaveRequest.status_name}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#F7F8FE] rounded-lg p-3 border border-[#E6E8F5]">
              <p className="text-xs text-gray-500">Tanggal Mulai</p>
              <p className="text-sm font-medium text-[#111827]">{formatDate(activeLeaveRequest.start_date)}</p>
            </div>
            <div className="bg-[#F7F8FE] rounded-lg p-3 border border-[#E6E8F5]">
              <p className="text-xs text-gray-500">Tanggal Selesai</p>
              <p className="text-sm font-medium text-[#111827]">{formatDate(activeLeaveRequest.end_date)}</p>
            </div>
            <div className="bg-[#F7F8FE] rounded-lg p-3 border border-[#E6E8F5]">
              <p className="text-xs text-gray-500">Total Hari</p>
              <p className="text-sm font-medium text-[#111827]">{activeLeaveRequest.total_days} hari</p>
            </div>
          </div>

          {activeLeaveRequest.reason && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Alasan</p>
              <p className="text-sm text-[#111827] bg-[#F7F8FE] border border-[#E6E8F5] p-3 rounded-lg break-words">{activeLeaveRequest.reason}</p>
            </div>
          )}

          {activeLeaveRequest.institution && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Institusi</p>
              <p className="text-sm text-gray-900 break-words">{activeLeaveRequest.institution}</p>
            </div>
          )}

          {activeLeaveRequest.education_type && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Jenis Pendidikan</p>
              <p className="text-sm text-gray-900 break-words">{activeLeaveRequest.education_type}</p>
            </div>
          )}

          {activeLeaveRequest.program_course && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Program/Kursus</p>
              <p className="text-sm text-gray-900 break-words">{activeLeaveRequest.program_course}</p>
            </div>
          )}

          {activeLeaveRequest.approval_notes && activeLeaveRequest.status !== 'pending' && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Catatan Keputusan Akhir</p>
              <p className="text-sm text-[#111827] bg-[#F7F8FE] border border-[#E6E8F5] p-3 rounded-lg break-words">{activeLeaveRequest.approval_notes}</p>
            </div>
          )}

          {hasDocument ? (
            <div>
              <p className="text-xs text-gray-500 mb-1">Dokumen Pendukung</p>
              {activeLeaveRequest.document_original_name && (
                <p className="mb-2 text-xs text-gray-600 break-all">{activeLeaveRequest.document_original_name}</p>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleViewDocument}
                  disabled={isOpeningDocument || isDownloadingDocument}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#222E6A] text-white text-sm font-medium hover:bg-[#1a2452] disabled:opacity-60 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z" />
                  </svg>
                  {isOpeningDocument ? 'Membuka...' : 'Lihat File'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDocument}
                  disabled={isOpeningDocument || isDownloadingDocument}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" />
                  </svg>
                  {isDownloadingDocument ? 'Mendownload...' : 'Download'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">Dokumen pendukung belum tersedia atau tidak dapat diakses.</p>
            </div>
          )}
        </div>

        <div className="bg-white border border-[#D8DAED] rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#222E6A]">Manager Penanggung Jawab per Tanggal</h3>
              <p className="text-xs text-gray-500">Approval mengikuti manager yang bertugas pada tanggal roster terkait.</p>
            </div>
          </div>

          <div className="space-y-3">
            {approvalDates.length > 0 ? approvalDates.map((approval, index) => (
              <div key={`${approval.work_date ?? approval.label ?? 'approval'}-${index}`} className="rounded-xl border border-[#E6E8F5] bg-[#F7F8FE] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Tanggal</p>
                      <p className="text-sm font-semibold text-[#222E6A] break-words">
                        {approval.work_date ? formatDate(approval.work_date) : approval.label || approval.approval_notes || '-'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {approval.employee_shift_notes && (
                        <span className="inline-flex items-center rounded-full bg-[#E6E8F5] px-2.5 py-1 text-[11px] font-medium text-[#434C79]">
                          Shift {approval.employee_shift_notes}
                        </span>
                      )}
                      {approval.current_user_can_approve && (
                        <span className="inline-flex items-center rounded-full bg-[#E6E9F7] px-2.5 py-1 text-[11px] font-medium text-[#222E6A]">
                          Tanggung jawab Anda
                        </span>
                      )}
                      {approval.current_user_already_approved && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                          Sudah Anda setujui
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Manager</p>
                      {approval.manager ? (
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-[#111827] break-words">{approval.manager.name}</p>
                          <p className="text-xs text-gray-500 break-all">{approval.manager.email}</p>
                          <p className="text-xs text-gray-500">{approval.manager.role}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-amber-700 break-words">{approval.approval_notes || 'Manager untuk tanggal ini belum tersedia.'}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getApprovalBadgeClass(approval)}`}>
                      {approval.status_name}
                    </span>
                    {approval.approved_at && (
                      <p className="text-xs text-gray-500 text-left sm:text-right">Diproses {formatDate(approval.approved_at)}</p>
                    )}
                    {approval.approval_notes && !approval.needs_assignment && (
                      <p className="max-w-xs text-xs text-gray-600 break-words text-left sm:text-right">{approval.approval_notes}</p>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-[#D8DAED] p-4 text-sm text-gray-500">
                Detail approval per tanggal belum tersedia.
              </div>
            )}
          </div>
        </div>

        {!actionType && activeLeaveRequest.status === 'pending' && !canTakeAction && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {activeLeaveRequest.current_user_already_approved
              ? 'Anda sudah menyetujui seluruh tanggal yang menjadi tanggung jawab Anda. Permohonan ini masih menunggu manager pada tanggal lainnya.'
              : 'Tombol approve dan reject hanya tersedia untuk manager yang memang bertugas pada tanggal cuti tersebut.'}
          </div>
        )}

        {actionType ? (
          <div className={`p-4 rounded-xl ${actionType === 'approve' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            <h4 className={`text-sm font-semibold mb-3 ${actionType === 'approve' ? 'text-emerald-800' : 'text-red-800'}`}>
              {actionType === 'approve' ? 'Menyetujui Tanggal Tanggung Jawab Anda' : 'Menolak Permohonan Cuti'}
            </h4>
            {actionType === 'approve' && currentUserPendingDates.length > 0 && (
              <p className="mb-3 text-xs text-emerald-700 break-words">
                Persetujuan ini akan diterapkan untuk tanggal: {currentUserPendingDates.map((date) => formatDate(date)).join(', ')}.
              </p>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Catatan {actionType === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={approvalNotes}
                onChange={(event) => setApprovalNotes(event.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-[#D8DAED] rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-sm"
                placeholder={actionType === 'approve' ? 'Tambahkan catatan (opsional)...' : 'Jelaskan alasan penolakan (wajib)...'}
                required={actionType === 'reject'}
              />
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 pt-5 border-t sm:flex sm:justify-end sm:gap-3 sm:pt-4">
          {!actionType ? (
            <>
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Tutup
              </Button>

              {canTakeAction && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    className="w-full sm:w-auto border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Tolak
                  </Button>
                  <Button
                    variant="success"
                    onClick={handleApprove}
                    className="w-full sm:w-auto"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Setujui
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Batal
              </Button>
              <Button
                variant={actionType === 'approve' ? 'success' : 'danger'}
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? 'Memproses...' : `Konfirmasi ${actionType === 'approve' ? 'Persetujuan' : 'Penolakan'}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default LeaveRequestApprovalModal;
