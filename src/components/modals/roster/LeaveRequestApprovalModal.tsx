import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from '../../common/Modal';
import Button from '../../ui/Button';
import type { LeaveRequest } from '../../../modules/roster/types/leaveRequest';
import { leaveRequestService } from '../../../modules/roster/repository/leaveRequestService';

interface LeaveRequestApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequest: LeaveRequest | null;
  onSuccess: () => void;
}

const LeaveRequestApprovalModal: React.FC<LeaveRequestApprovalModalProps> = ({
  isOpen,
  onClose,
  leaveRequest,
  onSuccess,
}) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isOpeningDocument, setIsOpeningDocument] = useState(false);
  const [isDownloadingDocument, setIsDownloadingDocument] = useState(false);

  const hasDocument = useMemo(() => {
    if (!leaveRequest) return false;

    return Boolean(
      leaveRequest.document_url ||
      leaveRequest.document_path ||
      leaveRequest.document_original_name ||
      leaveRequest.document_mime_type
    );
  }, [leaveRequest]);

  const handleApprove = () => {
    setActionType('approve');
  };

  const handleReject = () => {
    setActionType('reject');
  };

  const handleSubmit = async () => {
    if (!leaveRequest || !actionType) return;

    // Validate notes for rejection
    if (actionType === 'reject' && !approvalNotes.trim()) {
      toast.error('Catatan penolakan wajib diisi');
      return;
    }

    setIsLoading(true);
    try {
      await leaveRequestService.updateLeaveRequestStatus(leaveRequest.id, {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        approval_notes: approvalNotes.trim() || undefined,
      });

      toast.success(
        actionType === 'approve' 
          ? 'Permohonan cuti berhasil disetujui!' 
          : 'Permohonan cuti berhasil ditolak!'
      );
      
      setApprovalNotes('');
      setActionType(null);
      onSuccess();
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

    // Release memory after preview tab had enough time to load the blob.
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
    if (!leaveRequest) return;

    setIsOpeningDocument(true);
    try {
      const { blob, filename } = await leaveRequestService.getLeaveRequestDocumentBlob(leaveRequest.id);
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
    if (!leaveRequest) return;

    setIsDownloadingDocument(true);
    try {
      const { blob, filename } = await leaveRequestService.getLeaveRequestDocumentBlob(leaveRequest.id);
      triggerBlobDownload(blob, filename);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mendownload dokumen pendukung');
    } finally {
      setIsDownloadingDocument(false);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  if (!leaveRequest) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={actionType ? 'Konfirmasi Keputusan' : 'Detail Permohonan Cuti'}
      size="lg"
      headerClassName="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Employee Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Informasi Karyawan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-xs text-gray-500">Nama</p>
              <p className="text-sm font-medium text-gray-900 break-words">{leaveRequest.employee?.user?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900 break-all">{leaveRequest.employee?.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Leave Request Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <p className="text-xs text-gray-500">Jenis Cuti</p>
              <p className="text-sm font-semibold text-gray-900">{leaveRequest.request_type_name}</p>
            </div>
            <span className={`self-start px-3 py-1 rounded-full text-xs font-medium ${
              leaveRequest.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : leaveRequest.status === 'approved'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {leaveRequest.status_name}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Tanggal Mulai</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(leaveRequest.start_date)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Tanggal Selesai</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(leaveRequest.end_date)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Hari</p>
              <p className="text-sm font-medium text-gray-900">{leaveRequest.total_days} hari</p>
            </div>
          </div>

          {leaveRequest.reason && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Alasan</p>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg break-words">{leaveRequest.reason}</p>
            </div>
          )}

          {leaveRequest.institution && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Institusi</p>
              <p className="text-sm text-gray-900 break-words">{leaveRequest.institution}</p>
            </div>
          )}

          {leaveRequest.education_type && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Jenis Pendidikan</p>
              <p className="text-sm text-gray-900 break-words">{leaveRequest.education_type}</p>
            </div>
          )}

          {leaveRequest.program_course && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Program/Kursus</p>
              <p className="text-sm text-gray-900 break-words">{leaveRequest.program_course}</p>
            </div>
          )}

          {hasDocument && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Dokumen Pendukung</p>
              {leaveRequest.document_original_name && (
                <p className="mb-2 text-xs text-gray-600 break-all">{leaveRequest.document_original_name}</p>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleViewDocument}
                  disabled={isOpeningDocument || isDownloadingDocument}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
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
          )}

          {!hasDocument && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">Dokumen pendukung belum tersedia atau tidak dapat diakses.</p>
            </div>
          )}
        </div>

        {/* Action Type Selection or Notes */}
        {actionType ? (
          <div className={`p-4 rounded-xl ${actionType === 'approve' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h4 className={`text-sm font-semibold mb-3 ${actionType === 'approve' ? 'text-green-800' : 'text-red-800'}`}>
              {actionType === 'approve' ? '✓ Menyetujui Permohonan' : '✗ Menolak Permohonan'}
            </h4>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Catatan {actionType === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder={actionType === 'approve' ? 'Tambahkan catatan (opsional)...' : 'Jelaskan alasan penolakan (wajib)...'}
                required={actionType === 'reject'}
              />
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3 pt-5 border-t sm:flex sm:justify-end sm:gap-3 sm:pt-4">
          {!actionType ? (
            <>
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Tutup
              </Button>

              {leaveRequest.status === 'pending' && (
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
