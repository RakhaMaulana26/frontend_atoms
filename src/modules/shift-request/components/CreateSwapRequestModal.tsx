import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, ArrowRightLeft, Search, AlertCircle, Loader2 } from 'lucide-react';
import { shiftRequestService } from '../repository/shiftRequestService';
import type { MyShift, AvailableSwapPartner, CreateShiftRequestRequest } from '../../../types';

interface CreateSwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'select-my-shift' | 'select-partner' | 'confirm';

const CreateSwapRequestModal: React.FC<CreateSwapRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>('select-my-shift');
  const [myShifts, setMyShifts] = useState<MyShift[]>([]);
  const [partners, setPartners] = useState<AvailableSwapPartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Selection state
  const [selectedMyShift, setSelectedMyShift] = useState<MyShift | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<AvailableSwapPartner | null>(null);
  const [selectedPartnerShift, setSelectedPartnerShift] = useState<{
    roster_day_id: number;
    work_date: string;
    shift_id: number;
    shift_name: string;
    notes: string;
  } | null>(null);
  const [reason, setReason] = useState('');
  
  // Search/filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Load my shifts when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMyShifts();
    } else {
      // Reset state when closed
      setStep('select-my-shift');
      setSelectedMyShift(null);
      setSelectedPartner(null);
      setSelectedPartnerShift(null);
      setReason('');
      setSearchTerm('');
      setError(null);
    }
  }, [isOpen]);

  // Load partners when my shift is selected
  useEffect(() => {
    if (selectedMyShift) {
      loadAvailablePartners();
    }
  }, [selectedMyShift]);

  const loadMyShifts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await shiftRequestService.getMyShifts();
      setMyShifts(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data shift');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePartners = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await shiftRequestService.getAvailablePartners();
      setPartners(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat partner');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMyShift = (shift: MyShift) => {
    setSelectedMyShift(shift);
    setStep('select-partner');
  };

  const handleSelectPartnerShift = (
    partner: AvailableSwapPartner,
    shift: { roster_day_id: number; work_date: string; shift_id: number; shift_name: string; notes: string }
  ) => {
    setSelectedPartner(partner);
    setSelectedPartnerShift(shift);
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!selectedMyShift || !selectedPartner || !selectedPartnerShift) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const requestData: CreateShiftRequestRequest = {
        target_employee_id: selectedPartner.employee_id,
        from_roster_day_id: selectedMyShift.roster_day_id,
        to_roster_day_id: selectedPartnerShift.roster_day_id,
        requester_notes: selectedMyShift.notes,
        target_notes: selectedPartnerShift.notes,
        reason: reason || undefined,
      };
      
      await shiftRequestService.createShiftRequest(requestData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membuat permintaan');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const filteredPartners = partners.filter(partner =>
    partner.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-6 w-6" />
              <div>
                <h2 className="text-lg font-semibold">Tukar Shift</h2>
                <p className="text-sm opacity-90">
                  {step === 'select-my-shift' && 'Pilih shift Anda'}
                  {step === 'select-partner' && 'Pilih partner & shift tujuan'}
                  {step === 'confirm' && 'Konfirmasi permintaan'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {['Shift Saya', 'Partner', 'Konfirmasi'].map((label, index) => {
                const stepIndex = ['select-my-shift', 'select-partner', 'confirm'].indexOf(step);
                const isActive = index === stepIndex;
                const isComplete = index < stepIndex;
                
                return (
                  <div key={label} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      isActive ? 'bg-[#222E6A] text-white' :
                      isComplete ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isComplete ? '✓' : index + 1}
                    </div>
                    <span className={`ml-2 text-sm ${isActive ? 'text-[#222E6A] font-medium' : 'text-gray-500'}`}>
                      {label}
                    </span>
                    {index < 2 && (
                      <div className={`w-16 sm:w-24 h-1 mx-4 rounded ${
                        isComplete ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-10 w-10 text-[#222E6A] animate-spin" />
                <p className="mt-3 text-gray-500">Memuat data...</p>
              </div>
            ) : (
              <>
                {/* Step 1: Select My Shift */}
                {step === 'select-my-shift' && (
                  <div>
                    {myShifts.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">Tidak ada shift yang dapat ditukar</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Shift yang dapat ditukar minimal H-3 dari sekarang
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myShifts.map((shift) => (
                          <button
                            key={`${shift.roster_day_id}-${shift.shift_id}`}
                            onClick={() => !shift.has_pending_request && handleSelectMyShift(shift)}
                            disabled={shift.has_pending_request}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                              shift.has_pending_request
                                ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                : 'border-gray-200 hover:border-[#222E6A] hover:bg-blue-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="bg-[#D8DAED] p-2 rounded-lg">
                                  <Calendar className="h-5 w-5 text-[#454D7C]" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{formatDate(shift.work_date)}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{shift.shift_name}</span>
                                  </div>
                                </div>
                              </div>
                              {shift.has_pending_request && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                  Pending Request
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Select Partner */}
                {step === 'select-partner' && selectedMyShift && (
                  <div>
                    {/* Selected shift summary */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium mb-1">Shift Anda:</p>
                      <p className="text-sm text-gray-900">
                        {formatDate(selectedMyShift.work_date)} - {selectedMyShift.shift_name}
                      </p>
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari nama partner..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
                      />
                    </div>

                    {filteredPartners.length === 0 ? (
                      <div className="text-center py-8">
                        <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">Tidak ada partner tersedia</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredPartners.map((partner) => (
                          <div key={partner.employee_id} className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 flex items-center gap-3">
                              <div className="bg-[#D8DAED] p-2 rounded-full">
                                <User className="h-5 w-5 text-[#454D7C]" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{partner.employee_name}</p>
                                <p className="text-xs text-gray-500">
                                  {partner.employee_type} • Grup {partner.group_number || '-'}
                                </p>
                              </div>
                            </div>
                            <div className="p-3 space-y-2">
                              {partner.available_shifts.map((shift) => (
                                <button
                                  key={`${shift.roster_day_id}-${shift.shift_id}`}
                                  onClick={() => !shift.has_pending_request && handleSelectPartnerShift(partner, shift)}
                                  disabled={shift.has_pending_request}
                                  className={`w-full p-3 rounded-lg text-left text-sm transition-all ${
                                    shift.has_pending_request
                                      ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                                      : 'bg-white border border-gray-200 hover:border-[#222E6A] hover:bg-blue-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      <span>{formatDate(shift.work_date)}</span>
                                    </div>
                                    <span className="text-[#222E6A] font-medium">{shift.shift_name}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => setStep('select-my-shift')}
                      className="mt-4 text-sm text-[#222E6A] hover:underline"
                    >
                      ← Kembali pilih shift
                    </button>
                  </div>
                )}

                {/* Step 3: Confirm */}
                {step === 'confirm' && selectedMyShift && selectedPartner && selectedPartnerShift && (
                  <div>
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">Ringkasan Tukar Shift</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {/* My Shift */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">Shift Anda (akan ditukar)</p>
                          <p className="font-medium text-gray-900 text-sm">{formatDate(selectedMyShift.work_date)}</p>
                          <p className="text-[#222E6A] font-medium text-sm mt-1">{selectedMyShift.shift_name}</p>
                        </div>
                        
                        {/* Partner Shift */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">Shift Tujuan (akan didapat)</p>
                          <p className="font-medium text-gray-900 text-sm">{formatDate(selectedPartnerShift.work_date)}</p>
                          <p className="text-[#222E6A] font-medium text-sm mt-1">{selectedPartnerShift.shift_name}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Partner: <span className="font-medium text-gray-900">{selectedPartner.employee_name}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alasan (opsional)
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        placeholder="Masukkan alasan tukar shift..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#222E6A] focus:border-transparent resize-none"
                      />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Catatan:</strong> Permintaan ini akan dikirim ke {selectedPartner.employee_name} untuk disetujui. 
                        Setelah partner setuju, manager akan melakukan approval final.
                      </p>
                    </div>

                    <button
                      onClick={() => setStep('select-partner')}
                      className="text-sm text-[#222E6A] hover:underline"
                    >
                      ← Kembali pilih partner
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {step === 'confirm' && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-[#222E6A] text-white text-sm font-medium rounded-lg hover:bg-[#1a2550] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Kirim Permintaan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateSwapRequestModal;
