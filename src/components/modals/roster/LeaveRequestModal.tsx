import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Modal from '../../common/Modal';
import Button from '../../ui/Button';
import Select from '../../common/Select';
import { useAuth } from '../../../modules/auth/core/AuthContext';
import { leaveRequestService } from '../../../modules/roster/repository/leaveRequestService';
import type { LeaveApprovalPreview } from '../../../modules/roster/repository/leaveRequestService';
import type { LeaveRequest } from '../../../modules/roster/types/leaveRequest';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rosterMonth?: number;
  rosterYear?: number;
}

const LEAVE_TYPES = [
  { value: 'doctor_leave', label: 'Cuti Sakit' },
  { value: 'annual_leave', label: 'Cuti Kepentingan' },
  { value: 'external_duty', label: 'TPO' },
  { value: 'educational_assignment', label: 'Tugas Pendidikan' },
];

const ANNUAL_LEAVE_SUBTYPES = [
  { value: 'cuti_kepentingan', label: 'Cuti Kepentingan' },
  { value: 'cuti_bersalin', label: 'Cuti Bersalin' },
  { value: 'cuti_tahunan', label: 'Cuti Tahunan' },
];

const TPO_CITIES = [
  { value: 'Malang', label: 'Malang' },
  { value: 'Dhoho', label: 'Dhoho' },
  { value: 'Sumenep', label: 'Sumenep' },
];

const LEAVE_REQUEST_CREATED_EVENT = 'leave-request:create-optimistic';
const LEAVE_REQUEST_CONFIRMED_EVENT = 'leave-request:create-confirmed';
const LEAVE_REQUEST_ROLLED_BACK_EVENT = 'leave-request:create-rolled-back';

const REQUEST_TYPE_NAMES: Record<string, string> = {
  doctor_leave: 'Cuti Sakit',
  annual_leave: 'Cuti Kepentingan',
  external_duty: 'TPO',
  educational_assignment: 'Tugas Pendidikan',
};

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({ isOpen, onClose, onSuccess, rosterMonth, rosterYear }) => {
  const { user } = useAuth();
  const [requestType, setRequestType] = useState('');
  const [annualLeaveSubtype, setAnnualLeaveSubtype] = useState('cuti_kepentingan');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalDays, setTotalDays] = useState(0);
  const [institution, setInstitution] = useState('');
  const [educationType, setEducationType] = useState('');
  const [programCourse, setProgramCourse] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [approvalPreview, setApprovalPreview] = useState<LeaveApprovalPreview | null>(null);
  const [isLoadingApprovalPreview, setIsLoadingApprovalPreview] = useState(false);
  const [approvalPreviewError, setApprovalPreviewError] = useState('');

  const rosterStartDate = rosterMonth && rosterYear
    ? `${rosterYear}-${String(rosterMonth).padStart(2, '0')}-01`
    : '';
  const rosterEndDate = rosterMonth && rosterYear
    ? `${rosterYear}-${String(rosterMonth).padStart(2, '0')}-${String(new Date(rosterYear, rosterMonth, 0).getDate()).padStart(2, '0')}`
    : '';
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayDateString = formatLocalDate(new Date());
  const isRosterPeriodStarted = Boolean(rosterStartDate && todayDateString >= rosterStartDate);
  const availableLeaveTypes = isRosterPeriodStarted
    ? LEAVE_TYPES.filter((type) => type.value === 'doctor_leave')
    : LEAVE_TYPES;
  const isDoctorLeaveInStartedRoster = isRosterPeriodStarted && requestType === 'doctor_leave';
  const effectiveStartDateMin = isDoctorLeaveInStartedRoster
    ? todayDateString
    : (rosterStartDate || undefined);
  const effectiveStartDateMax = isDoctorLeaveInStartedRoster
    ? (rosterEndDate || todayDateString)
    : (rosterEndDate || undefined);
  const offDates = approvalPreview?.off_dates ?? [];
  const isAllOffRange = Boolean(
    approvalPreview
    && offDates.length > 0
    && approvalPreview.approvals.length === 0
    && approvalPreview.missing_dates.length === 0
  );

  // Auto-filled values
  const applicantName = user?.name || '';
  const applicantRole = user?.role_name || user?.role || user?.employee?.employee_type_name || user?.employee?.employee_type || '';
  const requestDate = new Date().toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });

  // Calculate total days when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day
      setTotalDays(diffDays);
    } else {
      setTotalDays(0);
    }
  }, [startDate, endDate]);

  const resetForm = () => {
    setRequestType('');
    setAnnualLeaveSubtype('cuti_kepentingan');
    setReason('');
    setStartDate('');
    setEndDate('');
    setTotalDays(0);
    setInstitution('');
    setEducationType('');
    setProgramCourse('');
    setUploadedFile(null);
    setFieldErrors({});
    setApprovalPreview(null);
    setApprovalPreviewError('');
    setIsLoadingApprovalPreview(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (requestType !== 'annual_leave') {
      setAnnualLeaveSubtype('cuti_kepentingan');
    }
  }, [requestType]);

  useEffect(() => {
    if (isRosterPeriodStarted && requestType && requestType !== 'doctor_leave') {
      setRequestType('');
    }
  }, [isRosterPeriodStarted, requestType]);

  useEffect(() => {
    if (!requestType || !startDate || !endDate) {
      setApprovalPreview(null);
      setApprovalPreviewError('');
      setIsLoadingApprovalPreview(false);
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setApprovalPreview(null);
      setApprovalPreviewError('Rentang tanggal tidak valid.');
      setIsLoadingApprovalPreview(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingApprovalPreview(true);
    setApprovalPreviewError('');

    leaveRequestService
      .getApprovalPreview({
        request_type: requestType,
        start_date: startDate,
        end_date: endDate,
      })
      .then((response) => {
        if (isCancelled) return;
        setApprovalPreview(response.data);
      })
      .catch((error: any) => {
        if (isCancelled) return;
        setApprovalPreview(null);
        const message = error?.response?.data?.message || 'Gagal memuat approver cuti.';
        setApprovalPreviewError(message);
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoadingApprovalPreview(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [requestType, startDate, endDate]);

  const clampToRosterRange = (value: string) => {
    const minDate = effectiveStartDateMin;
    const maxDate = effectiveStartDateMax;
    if (!value || !minDate || !maxDate) return value;
    if (value < minDate) return minDate;
    if (value > maxDate) return maxDate;
    return value;
  };

  const handleStartDateChange = (value: string) => {
    const nextStart = clampToRosterRange(value);
    setStartDate(nextStart);

    if (endDate) {
      const clampedEnd = clampToRosterRange(endDate);
      if (clampedEnd !== endDate) {
        setEndDate(clampedEnd);
      }
      if (clampedEnd && nextStart && clampedEnd < nextStart) {
        setEndDate(nextStart);
      }
    }
  };

  const handleEndDateChange = (value: string) => {
    const clamped = clampToRosterRange(value);
    if (startDate && clamped && clamped < startDate) {
      setEndDate(startDate);
      return;
    }
    setEndDate(clamped);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast.error('Only PDF, JPG, and PNG files are allowed');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation based on request type
    if (!requestType || !startDate || !endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isAllOffRange) {
      toast.error('Semua tanggal yang dipilih adalah hari libur, sehingga tidak perlu mengajukan cuti.');
      return;
    }

    if (isRosterPeriodStarted && requestType !== 'doctor_leave') {
      toast.error('Karena periode roster sudah berjalan, hanya Cuti Sakit yang dapat diajukan.');
      return;
    }

    const requiresDocument = requestType !== 'annual_leave';

    // Dokumen tidak wajib untuk cuti tahunan.
    if (requiresDocument && !uploadedFile) {
      toast.error('Dokumen pendukung wajib di-upload untuk tipe ini!');
      return;
    }
    
    // Reason required for leave types with personal justification
    if ((requestType === 'annual_leave' || requestType === 'doctor_leave') && !reason) {
      toast.error('Please provide a reason');
      return;
    }

    if (requestType === 'annual_leave' && !annualLeaveSubtype) {
      toast.error('Silakan pilih jenis cuti kepentingan');
      return;
    }
    
    // TPO city is required for external duty
    if (requestType === 'external_duty' && !institution) {
      toast.error('Silakan pilih kota tujuan TPO');
      return;
    }
    
    // Education type, program/course and institution required for educational assignment
    if (requestType === 'educational_assignment') {
      if (!educationType || !programCourse || !institution) {
        toast.error('Please fill in all educational assignment fields');
        return;
      }
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    if (rosterStartDate && rosterEndDate) {
      if (startDate < rosterStartDate || startDate > rosterEndDate || endDate < rosterStartDate || endDate > rosterEndDate) {
        toast.error(`Tanggal pengajuan harus dalam periode roster ${rosterStartDate} sampai ${rosterEndDate}`);
        return;
      }
    }

    setFieldErrors({});
    setIsLoading(true);
    const optimisticId = -Date.now();

    const optimisticRequest: LeaveRequest = {
      id: optimisticId,
      employee_id: Number(user?.employee?.id || 0),
      request_type: requestType as LeaveRequest['request_type'],
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      reason: reason || '',
      institution: institution || '',
      education_type: educationType || '',
      program_course: programCourse || '',
      status: 'pending',
      status_name: 'Menunggu',
      request_type_name: REQUEST_TYPE_NAMES[requestType] || requestType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      employee: {
        id: Number(user?.employee?.id || 0),
        user_id: Number(user?.id || 0),
        employee_type: String(user?.employee?.employee_type || user?.role || '-'),
        user: {
          id: Number(user?.id || 0),
          name: user?.name || 'Unknown',
          email: user?.email || '-',
        },
      },
    };

    window.dispatchEvent(
      new CustomEvent(LEAVE_REQUEST_CREATED_EVENT, {
        detail: { request: optimisticRequest },
      })
    );
    
    try {
      // Prepare FormData for API call
      const formData = new FormData();
      formData.append('request_type', requestType);
      if (requestType === 'annual_leave') {
        formData.append('annual_leave_subtype', annualLeaveSubtype || 'cuti_kepentingan');
      }
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('reason', reason || '');
      formData.append('institution', institution || '');
      formData.append('education_type', educationType || '');
      formData.append('program_course', programCourse || '');
      if (uploadedFile) {
        formData.append('document', uploadedFile);
      }
      
      // Submit to API
      const response = await leaveRequestService.createLeaveRequest(formData);

      if (response?.data) {
        window.dispatchEvent(
          new CustomEvent(LEAVE_REQUEST_CONFIRMED_EVENT, {
            detail: { tempId: optimisticId, request: response.data },
          })
        );
      }
      
      toast.success('Permohonan cuti berhasil diajukan! Email telah dikirim ke manager.');
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      window.dispatchEvent(
        new CustomEvent(LEAVE_REQUEST_ROLLED_BACK_EVENT, {
          detail: { tempId: optimisticId },
        })
      );
      console.error('Failed to submit leave request:', error);
      const responseData = error.response?.data;
      // Handle Laravel validation errors (422)
      if (error.response?.status === 422 && responseData?.errors) {
        const errors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(responseData.errors as Record<string, string[]>)) {
          errors[field] = Array.isArray(messages) ? messages[0] : String(messages);
        }
        setFieldErrors(errors);
        toast.error('Periksa kembali isian form, ada data yang tidak valid.');
      } else {
        const errorMessage = responseData?.message || 'Gagal mengajukan permohonan cuti';
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderUploadPrompt = (iconSize: 'compact' | 'regular' = 'regular') => (
    <>
      <svg
        className={iconSize === 'compact' ? 'w-6 h-6 text-gray-400 mb-1' : 'w-8 h-8 text-gray-400 mb-2'}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <span className={`${iconSize === 'compact' ? 'text-xs' : 'text-xs sm:text-sm'} max-w-full break-all text-center text-gray-600 font-medium ${iconSize === 'regular' ? 'mb-1' : ''}`}>
        {uploadedFile ? uploadedFile.name : 'Upload File'}
      </span>
      <span className={`${iconSize === 'compact' ? 'text-[10px]' : 'text-xs'} text-gray-500 text-center mt-1`}>
        Drag & drop or browse to upload document (PDF, JPG, PNG)
      </span>
    </>
  );

  const renderSelectedFile = () => {
    if (!uploadedFile) return null;

    return (
      <div className="mt-2 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
        <div className="min-w-0 flex-1 flex items-start gap-2">
          <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="min-w-0 flex-1 break-all text-xs text-blue-700 font-medium">{uploadedFile.name}</span>
        </div>
        <button
          type="button"
          onClick={() => setUploadedFile(null)}
          className="text-red-600 hover:text-red-800 flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  };

  // Determine request type for labels
  const isExternalDuty = requestType === 'external_duty';
  const isEducationalAssignment = requestType === 'educational_assignment';
  const periodLabel = (isExternalDuty || isEducationalAssignment) ? 'Duty Period' : 'Leave Period';

  const renderApprovalPreview = () => {
    if (!requestType || !startDate || !endDate) {
      return null;
    }

    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-[#1a2452] mb-1">Approver Cuti</p>

        {isLoadingApprovalPreview && (
          <p className="text-xs text-blue-700">Mencari manager approver berdasarkan tanggal yang dipilih...</p>
        )}

        {!isLoadingApprovalPreview && approvalPreviewError && (
          <p className="text-xs text-red-600">{approvalPreviewError}</p>
        )}

        {!isLoadingApprovalPreview && !approvalPreviewError && approvalPreview && approvalPreview.missing_dates.length > 0 && (
          <div>
            <p className="text-xs text-red-700 mb-1">Beberapa tanggal belum punya approver:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {approvalPreview.missing_dates.map((item, index) => (
                <li key={`${item}-${index}`} className="text-xs text-red-600">{item}</li>
              ))}
            </ul>
          </div>
        )}

        {!isLoadingApprovalPreview && !approvalPreviewError && approvalPreview && offDates.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-emerald-700 mb-1">Tanggal libur tidak memerlukan persetujuan:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {offDates.map((item, index) => (
                <li key={`${item}-${index}`} className="text-xs text-emerald-600">{item}</li>
              ))}
            </ul>
          </div>
        )}

        {!isLoadingApprovalPreview && !approvalPreviewError && isAllOffRange && (
          <p className="mt-2 text-xs text-red-700">
            Semua tanggal yang dipilih adalah hari libur. Pengajuan cuti akan dinonaktifkan.
          </p>
        )}

        {!isLoadingApprovalPreview && !approvalPreviewError && approvalPreview && approvalPreview.missing_dates.length === 0 && (
          <div className="space-y-1">
            {approvalPreview.unique_approvers.length > 0 ? (
              approvalPreview.unique_approvers.map((approver) => (
                <p key={approver.manager_employee_id} className="text-xs text-blue-900">
                  - {approver.manager_name || 'Manager tidak diketahui'}
                  {approver.manager_role ? ` (${approver.manager_role})` : ''}
                </p>
              ))
            ) : (
              <p className="text-xs text-blue-800">Approver belum ditemukan untuk rentang tanggal ini.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Request Leave" 
      size="xl" 
      headerClassName="bg-gradient-to-r from-[#222E6A] to-[#1a2452] text-white flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Field-level validation errors summary */}
        {Object.keys(fieldErrors).length > 0 && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
            <p className="text-xs sm:text-sm font-semibold text-red-700 mb-1">Periksa kembali isian berikut:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {Object.entries(fieldErrors).map(([field, msg]) => (
                <li key={field} className="text-xs text-red-600">{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Conditional Layout based on Request Type */}
        {requestType === 'annual_leave' ? (
          /* 3-Column Layout for Annual Leave - NO UPLOAD FILE */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Column 1 - Applicant Information */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-[#222E6A]">Applicant Information</h3>
              
              {/* Name - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Name
                </label>
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={applicantName}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700"
                  />
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Role - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Role
                </label>
                <div className="flex flex-col gap-1">
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span>{applicantRole || 'N/A'}</span>
                  </div>
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Request Date - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Request Date
                </label>
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={requestDate}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700"
                  />
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Request Type */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Request Type
                </label>
                <Select
                  options={[
                    { value: '', label: 'Select request type' },
                    ...availableLeaveTypes
                  ]}
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  required
                />
                {isRosterPeriodStarted && (
                  <p className="mt-1 text-xs text-amber-700">
                    Bulan roster sudah berjalan. Pengajuan dibatasi hanya untuk Cuti Sakit.
                  </p>
                )}
              </div>

              {/* Annual Leave Subtype */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Jenis Cuti Kepentingan
                </label>
                <Select
                  options={ANNUAL_LEAVE_SUBTYPES}
                  value={annualLeaveSubtype}
                  onChange={(e) => setAnnualLeaveSubtype(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Column 2 - Reason */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-[#222E6A]">Reason</h3>
              <div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-xs sm:text-sm resize-none"
                  placeholder="Personal leave for rest and family matters"
                  required
                />
              </div>
            </div>

            {/* Column 3 - Leave Period (NO UPLOAD) */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-[#222E6A]">{periodLabel}</h3>
              
              {/* Start Date */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  min={effectiveStartDateMin}
                  max={effectiveStartDateMax}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-xs sm:text-sm"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  min={startDate || effectiveStartDateMin}
                  max={effectiveStartDateMax}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-xs sm:text-sm"
                  required
                />
              </div>

              {/* Total Days */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Total Days
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded-md flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-700">{totalDays}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : requestType === 'doctor_leave' ? (
          /* 3-Column Layout for Sick Leave - WITH UPLOAD FILE */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Column 1 - Applicant Information */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-[#222E6A]">Applicant Information</h3>
              
              {/* Name - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Name
                </label>
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={applicantName}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700"
                  />
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Role - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Role
                </label>
                <div className="flex flex-col gap-1">
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span>{applicantRole || 'N/A'}</span>
                  </div>
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Request Date - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Request Date
                </label>
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={requestDate}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700"
                  />
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Request Type */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Request Type
                </label>
                <Select
                  options={[
                    { value: '', label: 'Select request type' },
                    ...availableLeaveTypes
                  ]}
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  required
                />
                {isRosterPeriodStarted && (
                  <p className="mt-1 text-xs text-amber-700">
                    Bulan roster sudah berjalan. Pengajuan dibatasi hanya untuk Cuti Sakit.
                  </p>
                )}
              </div>
            </div>

            {/* Column 2 - Reason */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-[#222E6A]">Reason</h3>
              <div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-xs sm:text-sm resize-none"
                  placeholder="Personal leave for rest and family matters"
                  required
                />
              </div>
            </div>

            {/* Column 3 - Leave Period */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-[#222E6A]">{periodLabel}</h3>
              
              {/* Start Date */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  min={effectiveStartDateMin}
                  max={effectiveStartDateMax}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-xs sm:text-sm"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  min={startDate || effectiveStartDateMin}
                  max={effectiveStartDateMax}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-xs sm:text-sm"
                  required
                />
              </div>

              {/* Total Days */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Total Days
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded-md flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-700">{totalDays}</span>
                  </div>
                </div>
              </div>

              {/* Upload File */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Upload File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
                  <input
                    type="file"
                    id="file-upload-leave"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload-leave"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    {renderUploadPrompt('compact')}
                  </label>
                </div>
                {renderSelectedFile()}
              </div>
            </div>
          </div>
        ) : isExternalDuty ? (
          /* 2-Column Layout for TPO */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Column 1 - Applicant Information */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-[#222E6A]">Applicant Information</h3>
              
              {/* Name - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Name
                </label>
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={applicantName}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700"
                  />
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Role - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Role
                </label>
                <div className="flex flex-col gap-1">
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span>{applicantRole || 'N/A'}</span>
                  </div>
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Request Date - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Request Date
                </label>
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={requestDate}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700"
                  />
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Request Type */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Request Type
                </label>
                <Select
                  options={[
                    { value: '', label: 'Select request type' },
                    ...availableLeaveTypes
                  ]}
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  required
                />
                {isRosterPeriodStarted && (
                  <p className="mt-1 text-xs text-amber-700">
                    Bulan roster sudah berjalan. Pengajuan dibatasi hanya untuk Cuti Sakit.
                  </p>
                )}
              </div>
            </div>

            {/* Column 2 - Duty Period */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-[#222E6A]">{periodLabel}</h3>
              
              {/* Start Date */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  min={effectiveStartDateMin}
                  max={effectiveStartDateMax}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-xs sm:text-sm"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  min={startDate || effectiveStartDateMin}
                  max={effectiveStartDateMax}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-xs sm:text-sm"
                  required
                />
              </div>

              {/* Total Days */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Total Days
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded-md flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-700">{totalDays}</span>
                  </div>
                </div>
              </div>

              {/* TPO City */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Kota TPO
                </label>
                <Select
                  options={[
                    { value: '', label: 'Pilih kota tujuan TPO' },
                    ...TPO_CITIES,
                  ]}
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  required
                />
              </div>

              {/* Upload File */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Upload File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <input
                    type="file"
                    id="file-upload-duty"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload-duty"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    {renderUploadPrompt()}
                  </label>
                </div>
                {renderSelectedFile()}
              </div>
            </div>
          </div>
        ) : isEducationalAssignment ? (
          /* 2-Column Layout for Educational Assignment */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Column 1 - Applicant Information */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-[#222E6A]">Applicant Information</h3>
              
              {/* Name - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Name
                </label>
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={applicantName}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700"
                  />
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Role - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Role
                </label>
                <div className="flex flex-col gap-1">
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span>{applicantRole || 'N/A'}</span>
                  </div>
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Request Date - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Request Date
                </label>
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={requestDate}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700"
                  />
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Request Type */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Request Type
                </label>
                <Select
                  options={[
                    { value: '', label: 'Select request type' },
                    ...availableLeaveTypes
                  ]}
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  required
                />
                {isRosterPeriodStarted && (
                  <p className="mt-1 text-xs text-amber-700">
                    Bulan roster sudah berjalan. Pengajuan dibatasi hanya untuk Cuti Sakit.
                  </p>
                )}
              </div>
            </div>

            {/* Column 2 - Education Type & Duty Period */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-[#222E6A]">Education Type</h3>
              
              {/* Education Type Dropdown */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Education Type
                </label>
                <Select
                  options={[
                    { value: '', label: 'Select education type' },
                    { value: 'training', label: 'Training' },
                    { value: 'workshop', label: 'Workshop' },
                    { value: 'seminar', label: 'Seminar' },
                    { value: 'certification', label: 'Certification' },
                    { value: 'degree', label: 'Degree Program' },
                  ]}
                  value={educationType}
                  onChange={(e) => setEducationType(e.target.value)}
                  required
                />
              </div>

              {/* Program / Course */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Program / Course
                </label>
                <textarea
                  value={programCourse}
                  onChange={(e) => setProgramCourse(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-xs sm:text-sm resize-none"
                  placeholder="CNS Equipment Preventive Maintenance Training"
                  required
                />
              </div>

              {/* Institution / Assignment Location */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Institution / Assignment Location
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-xs sm:text-sm"
                  placeholder="AirNav Indonesia - Sumenep Branch"
                  required
                />
              </div>

              <h3 className="text-sm sm:text-base font-bold text-[#222E6A] pt-2">{periodLabel}</h3>
              
              {/* Start Date */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  min={effectiveStartDateMin}
                  max={effectiveStartDateMax}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-xs sm:text-sm"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  min={startDate || effectiveStartDateMin}
                  max={effectiveStartDateMax}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-xs sm:text-sm"
                  required
                />
              </div>

              {/* Total Days */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Total Days
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded-md flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-700">{totalDays}</span>
                  </div>
                </div>
              </div>

              {/* Official Letter / Assignment Letter */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Official Letter / Assignment Letter
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <input
                    type="file"
                    id="file-upload-educational"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload-educational"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    {renderUploadPrompt()}
                  </label>
                </div>
                {renderSelectedFile()}
              </div>
            </div>
          </div>
        ) : (
          /* Default 2-Column Layout for unselected or other types */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column - Applicant Information */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-[#222E6A]">Applicant Information</h3>
              
              {/* Name - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Name
                </label>
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={applicantName}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700"
                  />
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Role - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Role
                </label>
                <div className="flex flex-col gap-1">
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span>{applicantRole || 'N/A'}</span>
                  </div>
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Request Date - Auto-filled */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Request Date
                </label>
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={requestDate}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700"
                  />
                  <span className="text-xs text-gray-500">(auto-filled)</span>
                </div>
              </div>

              {/* Request Type */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#222E6A] mb-2">
                  Request Type
                </label>
                <Select
                  options={[
                    { value: '', label: 'Select request type' },
                    ...availableLeaveTypes
                  ]}
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  required
                />
                {isRosterPeriodStarted && (
                  <p className="mt-1 text-xs text-amber-700">
                    Bulan roster sudah berjalan. Pengajuan dibatasi hanya untuk Cuti Sakit.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Period Information */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-[#222E6A]">Period Information</h3>
              <p className="text-sm text-gray-600">Please select a request type to continue</p>
            </div>
          </div>
        )}

        {renderApprovalPreview()}
        
        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3 pt-3 sm:pt-4 border-t">
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full sm:ml-auto sm:w-auto px-6 bg-[#222E6A] hover:bg-[#1a2452]"
            disabled={isAllOffRange}
          >
            <span className="text-xs sm:text-sm">Submit</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LeaveRequestModal;
