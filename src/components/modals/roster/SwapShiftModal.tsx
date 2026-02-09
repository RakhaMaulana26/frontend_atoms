import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Modal from '../../common/Modal';
import Button from '../../ui/Button';
import Select from '../../common/Select';
import { shiftRequestService, type MyShift, type AvailablePartner } from '../../../modules/roster/repository/shiftRequestService';

interface SwapShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SwapShiftModal: React.FC<SwapShiftModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [myShifts, setMyShifts] = useState<MyShift[]>([]);
  const [availablePartners, setAvailablePartners] = useState<AvailablePartner[]>([]);
  const [filteredDates, setFilteredDates] = useState<{ roster_day_id: number; work_date: string; shift_id: number; shift_name: string; }[]>([]);
  
  const [selectedMyShift, setSelectedMyShift] = useState<MyShift | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<AvailablePartner | null>(null);
  const [selectedPartnerShift, setSelectedPartnerShift] = useState<{ roster_day_id: number; work_date: string; shift_id: number; shift_name: string; } | null>(null);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load my shifts when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMyShifts();
    } else {
      // Reset form when modal closes
      resetForm();
    }
  }, [isOpen]);

  // When partner is selected, filter their available dates
  useEffect(() => {
    if (selectedPartner) {
      setFilteredDates(selectedPartner.available_shifts);
    } else {
      setFilteredDates([]);
    }
  }, [selectedPartner]);

  // When partner shift is selected, load available partners for that date/shift
  useEffect(() => {
    if (selectedPartnerShift && !selectedPartner) {
      loadAvailablePartnersForShift();
    }
  }, [selectedPartnerShift]);

  const loadMyShifts = async () => {
    setIsLoadingData(true);
    try {
      const data = await shiftRequestService.getMyShifts();
      setMyShifts(data.data);
    } catch (error: any) {
      console.error('Failed to load shifts:', error);
      toast.error('Failed to load your shifts');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadAvailablePartnersForShift = async () => {
    if (!selectedPartnerShift) return;
    
    setIsLoadingData(true);
    try {
      const data = await shiftRequestService.getAvailablePartners({
        roster_day_id: selectedPartnerShift.roster_day_id,
        shift_id: selectedPartnerShift.shift_id,
      });
      setAvailablePartners(data.data);
    } catch (error: any) {
      console.error('Failed to load partners:', error);
      toast.error('Failed to load available partners');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadAvailablePartnersForEmployee = async (employeeId: number) => {
    setIsLoadingData(true);
    try {
      const data = await shiftRequestService.getAvailablePartners({
        employee_id: employeeId,
      });
      setAvailablePartners(data.data);
      if (data.data.length > 0) {
        const partner = data.data.find((p: AvailablePartner) => p.employee_id === employeeId);
        if (partner) {
          setSelectedPartner(partner);
        }
      }
    } catch (error: any) {
      console.error('Failed to load partner shifts:', error);
      toast.error('Failed to load partner shifts');
    } finally {
      setIsLoadingData(false);
    }
  };

  const resetForm = () => {
    setSelectedMyShift(null);
    setSelectedPartner(null);
    setSelectedPartnerShift(null);
    setReason('');
    setMyShifts([]);
    setAvailablePartners([]);
    setFilteredDates([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMyShift || !selectedPartnerShift || !selectedPartner || !reason) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      await shiftRequestService.createShiftRequest({
        target_employee_id: selectedPartner.employee_id,
        from_roster_day_id: selectedMyShift.roster_day_id,
        to_roster_day_id: selectedPartnerShift.roster_day_id,
        shift_id: selectedPartnerShift.shift_id,
        reason: reason,
      });
      
      toast.success('Shift swap request submitted successfully!');
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Failed to submit shift swap:', error);
      toast.error(error.response?.data?.message || 'Failed to submit shift swap request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Shift Swap" size="lg" headerClassName="bg-[#222E6A] text-white flex items-center justify-between px-6 py-4 rounded-t-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {isLoadingData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">Loading data...</p>
          </div>
        )}

        {/* Current Shift Section */}
        <div>
          <h3 className="text-sm font-semibold text-[#222E6A] mb-4">Current Shift (Your Shift)</h3>
          <Select
            label="Select Your Shift to Swap"
            options={[
              { value: '', label: 'Select your shift' },
              ...myShifts.map(shift => ({
                value: shift.roster_day_id.toString(),
                label: `${new Date(shift.work_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - ${shift.shift_name}`
              }))
            ]}
            value={selectedMyShift?.roster_day_id.toString() || ''}
            onChange={(e) => {
              const shift = myShifts.find(s => s.roster_day_id.toString() === e.target.value);
              setSelectedMyShift(shift || null);
            }}
            disabled={isLoadingData}
          />
          {myShifts.length === 0 && !isLoadingData && (
            <p className="mt-2 text-xs text-gray-500 italic">
              No upcoming shifts available
            </p>
          )}
        </div>

        {/* Partner Selection - Select partner first */}
        <div>
          <h3 className="text-sm font-semibold text-[#222E6A] mb-4">Swap Partner</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Partner by Name
              </label>
              <input
                type="text"
                placeholder="Type employee name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-sm"
                onChange={(e) => {
                  const searchTerm = e.target.value.toLowerCase();
                  if (searchTerm.length >= 2) {
                    // In real implementation, this should call API with search
                    // For now, we load all and filter
                    loadAvailablePartnersForEmployee(0);
                  }
                }}
                disabled={isLoadingData}
              />
            </div>

            {availablePartners.length > 0 && (
              <Select
                label="Select Partner"
                options={[
                  { value: '', label: 'Select partner' },
                  ...availablePartners.map(partner => ({
                    value: partner.employee_id.toString(),
                    label: `${partner.employee_name} - ${partner.employee_role}`
                  }))
                ]}
                value={selectedPartner?.employee_id.toString() || ''}
                onChange={(e) => {
                  const partner = availablePartners.find(p => p.employee_id.toString() === e.target.value);
                  setSelectedPartner(partner || null);
                  setSelectedPartnerShift(null);
                }}
                disabled={isLoadingData}
              />
            )}
          </div>
        </div>

        {/* Requested Shift Section - Show partner's available dates */}
        {selectedPartner && (
          <div>
            <h3 className="text-sm font-semibold text-[#222E6A] mb-4">Requested Shift (Partner's Shift)</h3>
            <Select
              label="Select Partner's Shift"
              options={[
                { value: '', label: 'Select shift to swap with' },
                ...filteredDates.map(shift => ({
                  value: shift.roster_day_id.toString(),
                  label: `${new Date(shift.work_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - ${shift.shift_name}`
                }))
              ]}
              value={selectedPartnerShift?.roster_day_id.toString() || ''}
              onChange={(e) => {
                const shift = filteredDates.find(s => s.roster_day_id.toString() === e.target.value);
                setSelectedPartnerShift(shift || null);
              }}
              disabled={isLoadingData}
            />
            <p className="mt-2 text-xs text-gray-500 italic">
              * Only shifts where both you and partner have the same role are shown
            </p>
          </div>
        )}

        {/* Reason Section */}
        <div>
          <h3 className="text-sm font-semibold text-[#222E6A] mb-4">Reason</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Swap
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-sm resize-none"
              placeholder="Please provide a reason for this shift swap request..."
              required
              disabled={isLoadingData}
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t w-full -mx-6 px-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading || isLoadingData}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="flex-1 bg-[#222E6A] hover:bg-[#1a2452]"
            disabled={isLoadingData}
          >
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SwapShiftModal;
