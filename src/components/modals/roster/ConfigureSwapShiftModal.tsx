import React, { useState } from 'react';
import { toast } from 'react-toastify';
import Modal from '../../common/Modal';
import Button from '../../ui/Button';
import { Settings, Plus } from 'lucide-react';

interface SwapShiftRule {
  id: string;
  label: string;
  enabled: boolean;
}

interface ConfigureSwapShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ConfigureSwapShiftModal: React.FC<ConfigureSwapShiftModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [rules, setRules] = useState<SwapShiftRule[]>([
    { id: 'advance_days', label: 'Swap must be requested at least 3 days in advance', enabled: true },
    { id: 'monthly_limit', label: 'Limit of 2 swaps per employee per month', enabled: false },
    { id: 'manager_approval', label: 'Manager approval required', enabled: true },
    { id: 'same_role', label: 'Same role required (e.g. CNS Technician → CNS Technician)', enabled: true }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = (id: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const handleReset = () => {
    setRules([
      { id: 'advance_days', label: 'Swap must be requested at least 3 days in advance', enabled: true },
      { id: 'monthly_limit', label: 'Limit of 2 swaps per employee per month', enabled: false },
      { id: 'manager_approval', label: 'Manager approval required', enabled: true },
      { id: 'same_role', label: 'Same role required (e.g. CNS Technician → CNS Technician)', enabled: true }
    ]);
    toast.info('Rules reset to default');
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // TODO: Implement API call to save rules
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder
      toast.success('Shift swap rules saved successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save rules:', error);
      toast.error(error.response?.data?.message || 'Failed to save rules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRule = () => {
    toast.info('Add new rule functionality will be implemented');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Shifts" size="lg" headerClassName="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg">
      <div>
        {/* Subtitle and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-[#D8DAED] p-2 rounded-lg flex-shrink-0">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-[#454D7C]" />
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Manage shift swap policies</p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleAddRule}
            className="bg-[#222E6A] hover:bg-[#1a2452] text-xs sm:text-sm w-full sm:w-auto py-2"
          >
            <span className="hidden sm:inline">Add New Rules</span>
            <span className="sm:hidden">Add Rule</span>
          </Button>
        </div>

        {/* Rules Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_120px] bg-gray-50 border-b border-gray-200">
            <div className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-[#222E6A]">
              Rules
            </div>
            <div className="px-4 sm:px-6 py-3 text-center text-xs sm:text-sm font-semibold text-[#222E6A]">
              Status
            </div>
          </div>

          {/* Table Body */}
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className={`grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2 sm:gap-0 items-start sm:items-center p-3 sm:p-0 ${
                index !== rules.length - 1 ? 'border-b border-gray-200' : ''
              } hover:bg-gray-50 transition-colors`}
            >
              <div className="sm:px-6 sm:py-4 text-xs sm:text-sm text-[#222E6A] break-words">
                {rule.label}
              </div>
              <div className="flex items-center justify-between sm:justify-center sm:px-6 sm:py-4">
                <span className="text-xs font-medium text-gray-600 sm:hidden">
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle(rule.id)}
                  className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors ${
                    rule.enabled ? 'bg-[#222E6A]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                      rule.enabled ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-6 border-t w-full -mx-4 sm:-mx-6 px-4 sm:px-6 mt-4 sm:mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="flex-1 text-sm"
            disabled={isLoading}
          >
            Reset Rules
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            isLoading={isLoading}
            className="flex-1 bg-[#222E6A] hover:bg-[#1a2452] text-sm"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfigureSwapShiftModal;
