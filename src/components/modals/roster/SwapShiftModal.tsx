import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { flushSync } from 'react-dom';
import Modal from '../../common/Modal';
import Button from '../../ui/Button';
import { shiftRequestService, type MyShift, type AvailablePartner, type ShiftRequestItem } from '../../../modules/roster/repository/shiftRequestService';
import { useAuth } from '../../../modules/auth/core/AuthContext';
import { Loader2, Calendar, Clock, User, Shield } from 'lucide-react';

interface ManagerInfo {
  employee_id: number;
  user_id: number;
  name: string;
  notes: string;
  is_temporary?: boolean;
}

interface SwapShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rosterMonth?: number;
  rosterYear?: number;
}

const SHIFT_SWAP_REQUEST_CREATED_EVENT = 'shift-swap-request:create-optimistic';
const SHIFT_SWAP_REQUEST_CONFIRMED_EVENT = 'shift-swap-request:create-confirmed';
const SHIFT_SWAP_REQUEST_ROLLED_BACK_EVENT = 'shift-swap-request:create-rolled-back';
const waitForNextPaint = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

const SwapShiftModal: React.FC<SwapShiftModalProps> = ({ isOpen, onClose, onSuccess, rosterMonth, rosterYear }) => {
  const { user } = useAuth();
  const [myShifts, setMyShifts] = useState<MyShift[]>([]);
  const [availablePartners, setAvailablePartners] = useState<AvailablePartner[]>([]);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShiftNotes, setSelectedShiftNotes] = useState<string>('');
  const [newShiftId, setNewShiftId] = useState<number | ''>('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  
  // Manager info state
  const [currentShiftManager, setCurrentShiftManager] = useState<ManagerInfo | null>(null);
  const [requestedShiftManager, setRequestedShiftManager] = useState<ManagerInfo | null>(null);
  const [loadingCurrentManager, setLoadingCurrentManager] = useState(false);
  const [loadingRequestedManager, setLoadingRequestedManager] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [partnerLoadMessage, setPartnerLoadMessage] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const rosterMonthKey = useMemo(() => {
    if (!rosterMonth || !rosterYear) return null;
    return `${rosterYear}-${String(rosterMonth).padStart(2, '0')}`;
  }, [rosterMonth, rosterYear]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMyShifts();
      setAvailablePartners([]);
      loadAvailablePartners();
    } else {
      resetForm();
    }
  }, [isOpen]);

  const loadMyShifts = async () => {
    setIsLoadingData(true);
    setLoadError(null);
    try {
      const data = await shiftRequestService.getMyShifts();
      console.log('My shifts:', data);
      setMyShifts(data.data || []);
      if (data.data?.length === 0) {
        setLoadError('Tidak ada shift yang tersedia. Pastikan roster sudah dipublish dan shift minimal H-3 dari sekarang.');
      }
    } catch (error: any) {
      console.error('Failed to load shifts:', error);
      setLoadError(error.response?.data?.message || 'Gagal memuat data shift');
      toast.error('Gagal memuat data shift Anda');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadAvailablePartners = async (fromRosterDayId?: number, requesterNotes?: string) => {
    setIsLoadingPartners(true);
    setPartnerLoadMessage('');
    try {
      const params: { from_roster_day_id?: number; requester_notes?: string; roster_month?: number; roster_year?: number } = {};
      if (fromRosterDayId) params.from_roster_day_id = fromRosterDayId;
      if (requesterNotes) params.requester_notes = requesterNotes;
      if (rosterMonth) params.roster_month = rosterMonth;
      if (rosterYear) params.roster_year = rosterYear;
      
      const data = await shiftRequestService.getAvailablePartners(params);
      console.log('Available partners:', data);
      setAvailablePartners(data.data || []);
      if (!data.data || data.data.length === 0) {
        setPartnerLoadMessage(
          (data as any).message ||
          'Belum ada partner yang memenuhi syarat (roster published, H-3, tipe pegawai dan kelas jabatan kompatibel).'
        );
      }
    } catch (error: any) {
      console.error('Failed to load partners:', error);
      setPartnerLoadMessage(error.response?.data?.message || 'Gagal memuat data partner.');
    } finally {
      setIsLoadingPartners(false);
    }
  };

  const resetForm = () => {
    setSelectedDate('');
    setSelectedShiftNotes('');
    setNewShiftId('');
    setSelectedPartnerId('');
    setReason('');
    setMyShifts([]);
    setAvailablePartners([]);
    setIsLoadingPartners(false);
    setPartnerLoadMessage('');
    setLoadError(null);
    setCurrentShiftManager(null);
    setRequestedShiftManager(null);
  };

  const selectedPartner = useMemo(() => {
    if (!selectedPartnerId) return null;
    return availablePartners.find((p) => p.employee_id === selectedPartnerId) || null;
  }, [availablePartners, selectedPartnerId]);

  const isRequesterManagerTeknik = useMemo(() => {
    const roleNormalized = String(user?.role || '').toLowerCase();
    const employeeTypeNormalized = String(user?.employee?.employee_type || '').toLowerCase();
    return roleNormalized === 'manager teknik' || employeeTypeNormalized === 'manager teknik';
  }, [user?.role, user?.employee?.employee_type]);

  // Date options are constrained by roster period and selected partner/shift context.
  const availableDates = useMemo(() => {
    const baseDates = [...new Set(
      myShifts
        .map((s) => s.work_date)
        .filter((date) => !rosterMonthKey || date.startsWith(rosterMonthKey))
    )].sort();

    if (!selectedPartner) {
      return baseDates;
    }

    return baseDates.filter((date) => {
      const myShiftsOnDate = myShifts.filter((s) => s.work_date === date);
      const partnerShiftsOnDate = selectedPartner.available_shifts.filter(
        (s) => s.work_date === date && !s.has_pending_request
      );

      if (myShiftsOnDate.length === 0 || partnerShiftsOnDate.length === 0) {
        return false;
      }

      if (newShiftId) {
        const partnerHasRequestedShift = partnerShiftsOnDate.some((s) => s.shift_id === newShiftId);
        if (!partnerHasRequestedShift) return false;
        return myShiftsOnDate.some((s) => s.shift_id !== newShiftId);
      }

      return myShiftsOnDate.some((myShift) =>
        partnerShiftsOnDate.some((partnerShift) => partnerShift.shift_id !== myShift.shift_id)
      );
    });
  }, [myShifts, rosterMonthKey, selectedPartner, newShiftId]);

  useEffect(() => {
    if (selectedDate && !availableDates.includes(selectedDate)) {
      setSelectedDate('');
    }
  }, [selectedDate, availableDates]);

  // Current shift options are constrained by selected partner/requested shift (if selected).
  const shiftsForSelectedDate = useMemo(() => {
    const shifts = myShifts.filter((s) => {
      if (s.work_date !== selectedDate) return false;

      if (newShiftId && s.shift_id === newShiftId) return false;

      if (!selectedPartner) return true;

      const partnerHasDifferentShiftOnSameDate = selectedPartner.available_shifts.some((partnerShift) => {
        if (partnerShift.work_date !== selectedDate || partnerShift.has_pending_request) return false;
        if (newShiftId) return partnerShift.shift_id === newShiftId;
        return partnerShift.shift_id !== s.shift_id;
      });

      return partnerHasDifferentShiftOnSameDate;
    });

    // Deduplicate by notes to prevent duplicate dropdown options
    const uniqueShifts = shifts.filter((shift, index, self) =>
      index === self.findIndex(s => s.notes === shift.notes)
    );
    return uniqueShifts;
  }, [myShifts, selectedDate, selectedPartner, newShiftId]);

  // Get selected shift details
  const selectedShift = useMemo(() => {
    return myShifts.find(s => s.notes === selectedShiftNotes && s.work_date === selectedDate);
  }, [myShifts, selectedShiftNotes, selectedDate]);

  // Requested shift options are constrained by selected partner/date/current shift.
  const availableRequestedShifts = useMemo(() => {
    const shiftsMap = new Map<number, { shift_id: number; shift_name: string; notes: string; has_pending_request: boolean }>();

    const sourceShifts = selectedPartner
      ? selectedPartner.available_shifts
      : availablePartners.flatMap((partner) => partner.available_shifts);

    sourceShifts
      .filter((s) => !s.has_pending_request)
      .filter((s) => !selectedDate || s.work_date === selectedDate)
      .forEach((s) => {
        if (!shiftsMap.has(s.shift_id)) {
          shiftsMap.set(s.shift_id, {
            shift_id: s.shift_id,
            shift_name: s.shift_name,
            notes: s.notes,
            has_pending_request: false,
          });
        }
      });

    let options = Array.from(shiftsMap.values());
    if (selectedShift) {
      options = options.filter((s) => s.shift_id !== selectedShift.shift_id);
    }
    return options;
  }, [availablePartners, selectedPartner, selectedDate, selectedShift]);

  const selectedRequestedShift = useMemo(() => {
    if (!selectedDate || !newShiftId) return null;

    if (selectedPartner) {
      return (
        selectedPartner.available_shifts.find(
          (s) => s.work_date === selectedDate && s.shift_id === newShiftId && !s.has_pending_request
        ) || null
      );
    }

    for (const partner of availablePartners) {
      const found = partner.available_shifts.find(
        (s) => s.work_date === selectedDate && s.shift_id === newShiftId && !s.has_pending_request
      );
      if (found) return found;
    }
    return null;
  }, [availablePartners, selectedPartner, selectedDate, newShiftId]);

  // Partner options follow chosen date and requested shift context.
  const partnerOptions = useMemo(() => {
    const activeDate = selectedDate;

    return availablePartners.filter((partner) => {
      if (!activeDate) {
        if (!newShiftId) return true;
        return partner.available_shifts.some((s) => s.shift_id === newShiftId && !s.has_pending_request);
      }

      const partnerShiftsOnDate = partner.available_shifts.filter(
        (s) => s.work_date === activeDate && !s.has_pending_request
      );
      if (partnerShiftsOnDate.length === 0) return false;

      const myShiftsOnDate = myShifts.filter((s) => s.work_date === activeDate);
      if (myShiftsOnDate.length === 0) return false;

      if (newShiftId) {
        const partnerHasRequestedShift = partnerShiftsOnDate.some((s) => s.shift_id === newShiftId);
        if (!partnerHasRequestedShift) return false;
        return myShiftsOnDate.some((s) => s.shift_id !== newShiftId);
      }

      return myShiftsOnDate.some((myShift) =>
        partnerShiftsOnDate.some((partnerShift) => partnerShift.shift_id !== myShift.shift_id)
      );
    });
  }, [availablePartners, myShifts, selectedDate, newShiftId]);

  // Fetch manager for current shift when selected (with retry logic)
  useEffect(() => {
    const fetchCurrentManager = async (retryCount = 0) => {
      if (!selectedShift) {
        setCurrentShiftManager(null);
        setLoadingCurrentManager(false);
        return;
      }

      setLoadingCurrentManager(true);
      const maxRetries = 3;
      const retryDelay = 500 * Math.pow(2, retryCount); // exponential backoff
      let retryScheduled = false;

      try {
        console.log('[SwapShiftModal] Fetching current manager', {
          roster_day_id: selectedShift.roster_day_id,
          notes: selectedShift.notes,
          date: selectedShift.work_date,
        });

        const result = await shiftRequestService.getManagerForShift({
          roster_day_id: selectedShift.roster_day_id,
          notes: selectedShift.notes
        });

        console.log('[SwapShiftModal] Manager fetch result:', {
          data: result.data,
          notes: selectedShift.notes,
        });

        if (result.data) {
          setCurrentShiftManager(result.data);
        } else {
          // No manager found, but that's OK - could be regular employee
          setCurrentShiftManager(null);
          console.warn('[SwapShiftModal] No manager assigned for current shift', {
            notes: selectedShift.notes,
          });
        }
      } catch (error: any) {
        console.error('[SwapShiftModal] Failed to load current shift manager:', error);

        // Retry logic
        if (retryCount < maxRetries) {
          console.log(`[SwapShiftModal] Retrying manager fetch (attempt ${retryCount + 1}/${maxRetries})...`);
          retryScheduled = true;
          setTimeout(() => fetchCurrentManager(retryCount + 1), retryDelay);
          return;
        }

        // After max retries, set to null
        setCurrentShiftManager(null);
      } finally {
        if (!retryScheduled) {
          setLoadingCurrentManager(false);
        }
      }
    };

    fetchCurrentManager();
  }, [selectedShift?.roster_day_id, selectedShift?.notes]);

  // Reload partner candidates with exact current-shift context when current shift is known.
  useEffect(() => {
    if (selectedShift) {
      loadAvailablePartners(selectedShift.roster_day_id, selectedShift.notes);
    }
  }, [selectedShift?.roster_day_id, selectedShift?.notes]);

  useEffect(() => {
    if (newShiftId && !availableRequestedShifts.some((s) => s.shift_id === newShiftId)) {
      setNewShiftId('');
    }
  }, [newShiftId, availableRequestedShifts]);

  // Fetch manager for requested shift when selected (with retry logic)
  useEffect(() => {
    const fetchRequestedManager = async (retryCount = 0) => {
      if (!selectedRequestedShift) {
        setRequestedShiftManager(null);
        setLoadingRequestedManager(false);
        return;
      }

      setLoadingRequestedManager(true);
      const maxRetries = 3;
      const retryDelay = 500 * Math.pow(2, retryCount); // exponential backoff
      let retryScheduled = false;

      try {
        console.log('[SwapShiftModal] Fetching requested manager', {
          roster_day_id: selectedRequestedShift.roster_day_id,
          notes: selectedRequestedShift.notes,
          date: selectedRequestedShift.work_date,
        });

        const result = await shiftRequestService.getManagerForShift({
          roster_day_id: selectedRequestedShift.roster_day_id,
          notes: selectedRequestedShift.notes
        });

        console.log('[SwapShiftModal] Requested manager fetch result:', {
          data: result.data,
          notes: selectedRequestedShift.notes,
        });

        if (result.data) {
          setRequestedShiftManager(result.data);
        } else {
          // No manager found, but that's OK
          setRequestedShiftManager(null);
          console.warn('[SwapShiftModal] No manager assigned for requested shift', {
            notes: selectedRequestedShift.notes,
          });
        }
      } catch (error: any) {
        console.error('[SwapShiftModal] Failed to load requested shift manager:', error);

        // Retry logic
        if (retryCount < maxRetries) {
          console.log(`[SwapShiftModal] Retrying requested manager fetch (attempt ${retryCount + 1}/${maxRetries})...`);
          retryScheduled = true;
          setTimeout(() => fetchRequestedManager(retryCount + 1), retryDelay);
          return;
        }

        // After max retries, set to null
        setRequestedShiftManager(null);
      } finally {
        if (!retryScheduled) {
          setLoadingRequestedManager(false);
        }
      }
    };

    fetchRequestedManager();
  }, [selectedRequestedShift?.roster_day_id, selectedRequestedShift?.notes]);

  // Reset dependent fields when parent changes
  useEffect(() => {
    setSelectedShiftNotes('');
  }, [selectedDate]);

  useEffect(() => {
    // When date changes, reset selected requested shift and revalidate selected partner.
    setNewShiftId('');
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedPartnerId) return;
    const partnerStillValid = partnerOptions.some((p) => p.employee_id === selectedPartnerId);
    if (!partnerStillValid) {
      setSelectedPartnerId('');
    }
  }, [selectedPartnerId, partnerOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedShift || !selectedRequestedShift || !selectedPartnerId) {
      toast.error('Mohon lengkapi semua data');
      return;
    }

    flushSync(() => {
      setIsLoading(true);
    });
    const selectedPartner = availablePartners.find((partner) => partner.employee_id === selectedPartnerId);
    const tempId = -Date.now();

    const optimisticRequest: ShiftRequestItem = {
      id: tempId,
      requester_employee_id: user?.employee?.id || 0,
      target_employee_id: selectedPartnerId as number,
      from_roster_day_id: selectedShift.roster_day_id,
      to_roster_day_id: selectedShift.roster_day_id,
      requester_notes: selectedShift.notes,
      target_notes: selectedRequestedShift.notes,
      reason: reason || null,
      status: 'pending',
      approved_by_target: false,
      approved_by_from_manager: false,
      approved_by_to_manager: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_user_can_approve_as_target: false,
      current_user_can_approve_as_manager: false,
      current_user_already_approved: false,
      requester_employee: {
        id: user?.employee?.id || 0,
        employee_type: user?.employee?.employee_type || '-',
        user: {
          id: user?.id || 0,
          name: user?.name || '-',
        },
      },
      target_employee: {
        id: selectedPartnerId as number,
        employee_type: selectedPartner?.employee_type || '-',
        user: {
          id: 0,
          name: selectedPartner?.employee_name || '-',
        },
      },
      from_roster_day: {
        id: selectedShift.roster_day_id,
        work_date: selectedShift.work_date,
      },
      to_roster_day: {
        id: selectedShift.roster_day_id,
        work_date: selectedShift.work_date,
      },
      requester_shift_id: selectedShift.shift_id,
      target_shift_id: selectedRequestedShift.shift_id,
    };

    flushSync(() => {
      window.dispatchEvent(
        new CustomEvent(SHIFT_SWAP_REQUEST_CREATED_EVENT, {
          detail: { request: optimisticRequest },
        })
      );
    });
    
    try {
      await waitForNextPaint();
      const response = await shiftRequestService.createShiftRequest({
        target_employee_id: selectedPartnerId as number,
        from_roster_day_id: selectedShift.roster_day_id,
        to_roster_day_id: selectedShift.roster_day_id,
        requester_notes: selectedShift.notes,
        target_notes: selectedRequestedShift.notes,
        reason: reason || undefined,
      });

      window.dispatchEvent(
        new CustomEvent(SHIFT_SWAP_REQUEST_CONFIRMED_EVENT, {
          detail: {
            tempId,
            request: response.data,
          },
        })
      );
      
      toast.success('Permintaan tukar shift berhasil diajukan!');
      onSuccess();
      onClose();
    } catch (error: any) {
      window.dispatchEvent(
        new CustomEvent(SHIFT_SWAP_REQUEST_ROLLED_BACK_EVENT, {
          detail: { tempId },
        })
      );
      console.error('Failed to submit shift swap:', error);
      toast.error(error.response?.data?.message || 'Gagal mengajukan permintaan tukar shift');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatShiftTime = (shift: { shift_name: string; shift_start?: string; shift_end?: string }) => {
    const name = shift.shift_name.charAt(0).toUpperCase() + shift.shift_name.slice(1);
    if (shift.shift_start && shift.shift_end) {
      return `${name} (${shift.shift_start.slice(0,5)}-${shift.shift_end.slice(0,5)})`;
    }
    return name;
  };

  const formatPartnerShiftTime = (shift: { shift_name: string }) => {
    const name = shift.shift_name.charAt(0).toUpperCase() + shift.shift_name.slice(1);
    const timeMap: Record<string, string> = {
      'pagi': '(07.00-13.00)',
      'siang': '(13.00-19.00)',
      'malam': '(19.00-07.00)',
    };
    return `${name} ${timeMap[shift.shift_name.toLowerCase()] || ''}`;
  };

  const isFormValid = selectedShift && selectedRequestedShift && selectedPartnerId;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Request Shift Change" 
      size="xl" 
      headerClassName="bg-[#222E6A] text-white flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg"
    >
      {isLoadingData ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-[#222E6A] animate-spin mb-3" />
          <p className="text-gray-500 text-sm">Memuat data shift...</p>
        </div>
      ) : loadError && myShifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <Calendar className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-700 font-medium mb-2">Tidak dapat memuat data shift</p>
          <p className="text-gray-500 text-sm max-w-md">{loadError}</p>
          <Button
            type="button"
            variant="outline"
            onClick={loadMyShifts}
            className="mt-4"
          >
            Coba Lagi
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-5">
              {/* Employee Info Section */}
              <div>
                <h3 className="text-sm font-semibold text-[#222E6A] mb-3">Employee Info</h3>
                
                {/* Employee Name */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-[#222E6A] mb-1.5">Employee Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={user?.name || ''}
                      disabled
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">(auto-filled)</span>
                  </div>
                </div>

                {/* Role & Group */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-[#222E6A] mb-1.5">Role & Group</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={(() => {
                        const employeeType = user?.employee?.employee_type || user?.role || '';
                        const groupNumber = user?.employee?.group_number;
                        return groupNumber ? `${employeeType} - Group ${groupNumber}` : employeeType;
                      })()}
                      disabled
                      className="w-full pl-10 pr-20 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700"
                    />
                    <span className="absolute right-3 text-xs text-gray-400">(auto-filled)</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-[#222E6A] mb-1.5">Kelas Jabatan</label>
                  <input
                    type="text"
                    value={user?.grade != null ? `Level ${user.grade}` : '-'}
                    disabled
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Aturan swap kelas: sama kelas, atau pasangan 14-13, 12-11, serta grup level 8-9-10. Level 15 hanya dengan kelas yang sama.
                  </p>
                </div>
              </div>

              {/* Current Shift Section */}
              <div>
                <h3 className="text-sm font-semibold text-[#222E6A] mb-3">Current Shift</h3>
                
                {/* Original Date */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-[#222E6A] mb-1.5">Original Date</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#222E6A]">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                      }}
                      className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
                    >
                      <option value="">Select Date</option>
                      {availableDates.map(date => (
                        <option key={date} value={date}>{formatDate(date)}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Original Shift */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-[#222E6A] mb-1.5">Original Shift</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#222E6A]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedShiftNotes}
                      onChange={(e) => setSelectedShiftNotes(e.target.value)}
                      disabled={!selectedDate}
                      className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#222E6A] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Shift</option>
                      {shiftsForSelectedDate.map(shift => (
                        <option 
                          key={shift.notes} 
                          value={shift.notes}
                          disabled={shift.has_pending_request}
                        >
                          {formatShiftTime(shift)} {shift.has_pending_request ? '(pending)' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Manager on Duty for Current Shift */}
                {selectedShift && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700">{isRequesterManagerTeknik ? 'General Manager:' : 'Manager on Duty:'}</span>
                      {loadingCurrentManager ? (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      ) : currentShiftManager ? (
                        <>
                          <span className="text-xs text-blue-800 font-semibold">{currentShiftManager.name}</span>
                          {currentShiftManager.is_temporary && (
                            <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">Temp</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-blue-500 italic">{isRequesterManagerTeknik ? 'General Manager tidak ditemukan' : 'No manager assigned'}</span>
                      )}
                    </div>
                    {selectedShift && (
                      <div className="text-[9px] text-gray-500 mt-1">
                        Date: {formatDate(selectedShift.work_date)}, Shift: {selectedShift.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              {/* Requested Shift Section */}
              <div>
                <h3 className="text-sm font-semibold text-[#222E6A] mb-3">Requested Shift (Same Date)</h3>
                <p className="text-[11px] text-gray-500 mb-3">
                  Requested Shift otomatis mengikuti Original Date yang dipilih.
                </p>

                {/* New Shift */}
                <div>
                  <label className="block text-xs font-medium text-[#222E6A] mb-1.5">Requested Shift (Different Shift)</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#222E6A]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <select
                      value={newShiftId}
                      onChange={(e) => setNewShiftId(e.target.value ? Number(e.target.value) : '')}
                      disabled={!selectedDate}
                      className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#222E6A] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Shift</option>
                      {availableRequestedShifts.map(shift => (
                        <option 
                          key={shift.shift_id} 
                          value={shift.shift_id}
                          disabled={shift.has_pending_request}
                        >
                          {formatPartnerShiftTime(shift)} {shift.has_pending_request ? '(pending)' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Manager on Duty for Requested Shift */}
                {selectedRequestedShift && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700">{isRequesterManagerTeknik ? 'General Manager:' : 'Manager on Duty:'}</span>
                      {loadingRequestedManager ? (
                        <Loader2 className="w-3 h-3 animate-spin text-green-600" />
                      ) : requestedShiftManager ? (
                        <>
                          <span className="text-xs text-green-800 font-semibold">{requestedShiftManager.name}</span>
                          {requestedShiftManager.is_temporary && (
                            <span className="text-[10px] bg-green-200 text-green-700 px-1.5 py-0.5 rounded">Temp</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-green-500 italic">{isRequesterManagerTeknik ? 'General Manager tidak ditemukan' : 'No manager assigned'}</span>
                      )}
                    </div>
                    {selectedRequestedShift && (
                      <div className="text-[9px] text-gray-500 mt-1">
                        Date: {formatDate(selectedRequestedShift.work_date)}, Shift: {selectedRequestedShift.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Partner Approval Section */}
              <div>
                <h3 className="text-sm font-semibold text-[#222E6A] mb-3">Partner Approval</h3>
                
                {/* Swap Partner */}
                <div>
                  <label className="block text-xs font-medium text-[#222E6A] mb-1.5">Peer Approver (Same Role/Grade)</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#222E6A]">
                      <User className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedPartnerId}
                      onChange={(e) => setSelectedPartnerId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
                    >
                      <option value="">Select Partner</option>
                      {isLoadingPartners && (
                        <option value="" disabled>Loading partners...</option>
                      )}
                      {partnerOptions.length === 0 && (
                        <option value="" disabled>No partner available</option>
                      )}
                      {partnerOptions.map(partner => (
                        <option key={partner.employee_id} value={partner.employee_id}>
                          {`${partner.employee_name} (${partner.grade != null ? `Level ${partner.grade}` : 'Level -'})`}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-gray-300 text-[8px] flex items-center justify-center text-white">i</span>
                    Partner bisa dipilih dari awal, lalu opsi akan otomatis disaring setelah tanggal/shift dipilih.
                  </p>
                  {partnerLoadMessage && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      {partnerLoadMessage}
                    </p>
                  )}
                </div>
              </div>

              {/* Reason Section */}
              <div>
                <h3 className="text-sm font-semibold text-[#222E6A] mb-3">Reason</h3>
                
                <div>
                  <label className="block text-xs font-medium text-[#222E6A] mb-1.5">Reason for Swap</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
                    placeholder="Enter reason for shift swap..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={!isFormValid}
              className="bg-[#222E6A] hover:bg-[#1a2452] px-6"
            >
              Submit Change Request
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default SwapShiftModal;
