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
}

const SHIFT_SWAP_REQUEST_CREATED_EVENT = 'shift-swap-request:create-optimistic';
const SHIFT_SWAP_REQUEST_CONFIRMED_EVENT = 'shift-swap-request:create-confirmed';
const SHIFT_SWAP_REQUEST_ROLLED_BACK_EVENT = 'shift-swap-request:create-rolled-back';
const waitForNextPaint = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

const SwapShiftModal: React.FC<SwapShiftModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [myShifts, setMyShifts] = useState<MyShift[]>([]);
  const [availablePartners, setAvailablePartners] = useState<AvailablePartner[]>([]);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShiftNotes, setSelectedShiftNotes] = useState<string>('');
  const [newDate, setNewDate] = useState<string>('');
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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMyShifts();
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
    try {
      const params: { from_roster_day_id?: number; requester_notes?: string } = {};
      if (fromRosterDayId) params.from_roster_day_id = fromRosterDayId;
      if (requesterNotes) params.requester_notes = requesterNotes;
      
      const data = await shiftRequestService.getAvailablePartners(params);
      console.log('Available partners:', data);
      setAvailablePartners(data.data || []);
    } catch (error: any) {
      console.error('Failed to load partners:', error);
    }
  };

  const resetForm = () => {
    setSelectedDate('');
    setSelectedShiftNotes('');
    setNewDate('');
    setNewShiftId('');
    setSelectedPartnerId('');
    setReason('');
    setMyShifts([]);
    setAvailablePartners([]);
    setLoadError(null);
    setCurrentShiftManager(null);
    setRequestedShiftManager(null);
  };

  // Get unique dates from my shifts
  const availableDates = useMemo(() => {
    const uniqueDates = [...new Set(myShifts.map(s => s.work_date))];
    return uniqueDates.sort();
  }, [myShifts]);

  // Get shifts for selected date (deduplicated by notes)
  const shiftsForSelectedDate = useMemo(() => {
    const shifts = myShifts.filter(s => s.work_date === selectedDate);
    // Deduplicate by notes to prevent duplicate dropdown options
    const uniqueShifts = shifts.filter((shift, index, self) =>
      index === self.findIndex(s => s.notes === shift.notes)
    );
    return uniqueShifts;
  }, [myShifts, selectedDate]);

  // Get selected shift details
  const selectedShift = useMemo(() => {
    return myShifts.find(s => s.notes === selectedShiftNotes && s.work_date === selectedDate);
  }, [myShifts, selectedShiftNotes, selectedDate]);

  // Get all unique shifts available on new date (from all partners)
  const availableShiftsOnNewDate = useMemo(() => {
    if (!newDate) return [];
    const shiftsMap = new Map<number, { shift_id: number; shift_name: string; has_pending_request: boolean }>();
    availablePartners.forEach(p => {
      p.available_shifts
        .filter(s => s.work_date === newDate)
        .forEach(s => {
          // Only keep non-pending shifts
          if (!shiftsMap.has(s.shift_id) || !s.has_pending_request) {
            shiftsMap.set(s.shift_id, {
              shift_id: s.shift_id,
              shift_name: s.shift_name,
              has_pending_request: s.has_pending_request ?? false
            });
          }
        });
    });
    return Array.from(shiftsMap.values());
  }, [availablePartners, newDate]);

  // Get eligible partners for selected new date AND selected new shift
  const eligiblePartners = useMemo(() => {
    if (!newDate || !newShiftId) return [];
    return availablePartners.filter(p => 
      p.available_shifts.some(s => s.work_date === newDate && s.shift_id === newShiftId && !s.has_pending_request)
    );
  }, [availablePartners, newDate, newShiftId]);

  // Get unique new dates from all partner shifts
  const availableNewDates = useMemo(() => {
    const allDates = new Set<string>();
    availablePartners.forEach(p => {
      p.available_shifts.forEach(s => {
        allDates.add(s.work_date);
      });
    });
    return Array.from(allDates).sort();
  }, [availablePartners]);

  // Get selected partner shift details
  const selectedPartnerShift = useMemo(() => {
    const partner = availablePartners.find(p => p.employee_id === selectedPartnerId);
    return partner?.available_shifts.find(s => s.shift_id === newShiftId && s.work_date === newDate);
  }, [availablePartners, selectedPartnerId, newShiftId, newDate]);

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

  // Reload available partners when current shift changes (to filter by same-day different shift)
  useEffect(() => {
    if (selectedShift) {
      // Reset requested shift selection when current shift changes
      setNewDate('');
      setNewShiftId('');
      setSelectedPartnerId('');
      // Reload partners with the selected shift info
      loadAvailablePartners(selectedShift.roster_day_id, selectedShift.notes);
    }
  }, [selectedShift?.roster_day_id, selectedShift?.notes]);

  // Fetch manager for requested shift when selected (with retry logic)
  useEffect(() => {
    const fetchRequestedManager = async (retryCount = 0) => {
      if (!selectedPartnerShift) {
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
          roster_day_id: selectedPartnerShift.roster_day_id,
          notes: selectedPartnerShift.notes,
          date: selectedPartnerShift.work_date,
        });

        const result = await shiftRequestService.getManagerForShift({
          roster_day_id: selectedPartnerShift.roster_day_id,
          notes: selectedPartnerShift.notes
        });

        console.log('[SwapShiftModal] Requested manager fetch result:', {
          data: result.data,
          notes: selectedPartnerShift.notes,
        });

        if (result.data) {
          setRequestedShiftManager(result.data);
        } else {
          // No manager found, but that's OK
          setRequestedShiftManager(null);
          console.warn('[SwapShiftModal] No manager assigned for requested shift', {
            notes: selectedPartnerShift.notes,
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
  }, [selectedPartnerShift?.roster_day_id, selectedPartnerShift?.notes]);

  // Reset dependent fields when parent changes
  useEffect(() => {
    setSelectedShiftNotes('');
  }, [selectedDate]);

  useEffect(() => {
    // When newDate changes, reset both newShiftId and selectedPartnerId
    setNewShiftId('');
    setSelectedPartnerId('');
  }, [newDate]);

  useEffect(() => {
    // When newShiftId changes, reset selectedPartnerId (partner depends on shift now)
    setSelectedPartnerId('');
  }, [newShiftId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedShift || !selectedPartnerShift || !selectedPartnerId) {
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
      to_roster_day_id: selectedPartnerShift.roster_day_id,
      requester_notes: selectedShift.notes,
      target_notes: selectedPartnerShift.notes,
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
        id: selectedPartnerShift.roster_day_id,
        work_date: selectedPartnerShift.work_date,
      },
      requester_shift_id: selectedShift.shift_id,
      target_shift_id: selectedPartnerShift.shift_id,
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
        to_roster_day_id: selectedPartnerShift.roster_day_id,
        requester_notes: selectedShift.notes,
        target_notes: selectedPartnerShift.notes,
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

  const isFormValid = selectedShift && selectedPartnerShift && selectedPartnerId;

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
                      onChange={(e) => setSelectedDate(e.target.value)}
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
                      <span className="text-xs font-medium text-blue-700">Manager on Duty:</span>
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
                        <span className="text-xs text-blue-500 italic">No manager assigned</span>
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
                <h3 className="text-sm font-semibold text-[#222E6A] mb-3">Requested Shift</h3>
                
                {/* New Date */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-[#222E6A] mb-1.5">New Date</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#222E6A]">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <select
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
                    >
                      <option value="">Select Date</option>
                      {availableNewDates.map(date => (
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

                {/* New Shift */}
                <div>
                  <label className="block text-xs font-medium text-[#222E6A] mb-1.5">New Shift</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#222E6A]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <select
                      value={newShiftId}
                      onChange={(e) => setNewShiftId(e.target.value ? Number(e.target.value) : '')}
                      disabled={!newDate}
                      className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#222E6A] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Shift</option>
                      {availableShiftsOnNewDate.map(shift => (
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
                {selectedPartnerShift && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700">Manager on Duty:</span>
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
                        <span className="text-xs text-green-500 italic">No manager assigned</span>
                      )}
                    </div>
                    {selectedPartnerShift && (
                      <div className="text-[9px] text-gray-500 mt-1">
                        Date: {formatDate(selectedPartnerShift.work_date)}, Shift: {selectedPartnerShift.notes}
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
                  <label className="block text-xs font-medium text-[#222E6A] mb-1.5">Swap Partner</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#222E6A]">
                      <User className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedPartnerId}
                      onChange={(e) => setSelectedPartnerId(e.target.value ? Number(e.target.value) : '')}
                      disabled={!newShiftId}
                      className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#222E6A] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Partner</option>
                      {eligiblePartners.map(partner => (
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
                    Hanya partner yang sesuai kelas jabatan dan punya shift pada tanggal/shift terpilih yang ditampilkan
                  </p>
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
