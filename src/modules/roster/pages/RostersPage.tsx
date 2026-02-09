import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Input, PageHeader, Button, Modal, Select } from '../../../components';
import SwapShiftModal from '../../../components/modals/roster/SwapShiftModal';
import ConfigureSwapShiftModal from '../../../components/modals/roster/ConfigureSwapShiftModal';
import { Calendar, Plus, X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Sparkles, Link, Edit2, Trash2, RefreshCw, ArrowUpToLine, Settings, ArrowLeftRight } from 'lucide-react';
import { useDataCache } from '../../../contexts/DataCacheContext';
import { useAuth } from '../../auth/core/AuthContext';
import { rosterService } from '../repository/rosterService';
import type { RosterPeriod } from '../types/roster';

// Create Roster Modal Component
const CreateRosterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!month || !year) {
      toast.error('Please select month and year');
      return;
    }

    setIsLoading(true);
    
    try {
      // Send only month and year - backend will auto-generate days
      const createRequest = {
        month,
        year
      };

      await rosterService.createRoster(createRequest);
      toast.success('Roster template created successfully!');
      onSuccess();
      onClose();
      
      // Reset form
      setMonth(new Date().getMonth() + 1);
      setYear(new Date().getFullYear());
    } catch (error: any) {
      console.error('Failed to create roster:', error);
      toast.error(error.response?.data?.message || 'Failed to create roster');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Roster Template" size="md" headerClassName="bg-[#222E6A] text-white flex items-center justify-between px-6 py-4 rounded-t-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Information */}
        <div className="bg-[#D8DAED] border border-[#454D7C] rounded-lg p-3">
          <p className="text-sm text-[#222E6A]">
            This will create a roster template with all days for the selected month. 
            You can assign managers and shift employees later.
          </p>
        </div>

        {/* Period Selection */}
        <div>
          <h3 className="text-sm font-semibold text-[#222E6A] mb-4">Period Selection</h3>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Month"
              options={[...Array(12)].map((_, i) => ({
                value: String(i + 1),
                label: new Date(0, i).toLocaleString('default', { month: 'long' })
              }))}
              value={String(month)}
              onChange={(e) => setMonth(parseInt(e.target.value))}
            />
            <Input
              label="Year"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              min={new Date().getFullYear()}
              max={new Date().getFullYear() + 2}
              required
              leftIcon={
                <Calendar className="w-5 h-5 text-gray-400" />
              }
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
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="flex-1 bg-[#222E6A] hover:bg-[#1a2452]"
          >
            Create Roster Template
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Edit Roster Modal Component
const EditRosterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roster: RosterPeriod | null;
}> = ({ isOpen, onClose, onSuccess, roster }) => {
  const [month, setMonth] = useState(roster?.month || new Date().getMonth() + 1);
  const [year, setYear] = useState(roster?.year || new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);

  // Update state when roster changes
  React.useEffect(() => {
    if (roster) {
      setMonth(roster.month);
      setYear(roster.year);
    }
  }, [roster]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roster) return;

    setIsLoading(true);
    
    try {
      await rosterService.updateRoster(roster.id, { month, year });
      toast.success('Roster updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to update roster:', error);
      toast.error(error.response?.data?.message || 'Failed to update roster');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !roster) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-[#D8DAED] sm:mx-0 sm:h-10 sm:w-10">
              <Edit2 className="h-6 w-6 text-[#454D7C]" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Edit Roster
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Update the month and year for this roster period.
              </p>
              <div className="mt-4">
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Month
                      </label>
                      <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(0, i).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                      </label>
                      <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {Array.from({ length: 10 }, (_, i) => {
                          const y = new Date().getFullYear() - 2 + i;
                          return <option key={y} value={y}>{y}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4 border-t w-full -mx-6 px-6 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      variant="primary"
                      isLoading={isLoading}
                      className="flex-1 bg-[#222E6A] hover:bg-[#1a2452]"
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Delete Roster Modal Component
const DeleteRosterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roster: RosterPeriod | null;
}> = ({ isOpen, onClose, onSuccess, roster }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!roster) return;

    setIsLoading(true);
    
    try {
      await rosterService.deleteRoster(roster.id);
      toast.success('Roster deleted successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to delete roster:', error);
      toast.error(error.response?.data?.message || 'Failed to delete roster');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !roster) return null;

  const monthName = new Date(0, roster.month - 1).toLocaleString('default', { month: 'long' });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Delete Roster
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the roster for <span className="font-semibold">{monthName} {roster.year}</span>? 
                  This action cannot be undone and will delete all shift assignments.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t w-full -mx-6 px-6 mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              variant="danger"
              isLoading={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Import Roster Modal Component
const ImportRosterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [importMode, setImportMode] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    stats?: {
      employees_processed: number;
      employees_created: number;
      assignments_created: number;
      assignments_skipped: number;
      errors: string[];
    };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      setImportResult(null);
    } else {
      toast.error('Please drop a valid Excel file (.xlsx or .xls)');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    // Validate based on import mode
    if (importMode === 'file' && !selectedFile) {
      toast.error('Please select a file first');
      return;
    }
    if (importMode === 'url' && !spreadsheetUrl) {
      toast.error('Please enter a spreadsheet URL');
      return;
    }

    setIsLoading(true);
    setImportResult(null);

    try {
      let result;
      if (importMode === 'file') {
        result = await rosterService.importRoster(selectedFile!, useAI);
      } else {
        result = await rosterService.importRosterFromUrl(spreadsheetUrl, useAI);
      }
      
      setImportResult({
        success: true,
        message: result.message,
        stats: result.data.stats,
      });
      toast.success('Roster imported successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to import roster:', error);
      setImportResult({
        success: false,
        message: error.response?.data?.message || error.response?.data?.error || 'Failed to import roster',
      });
      toast.error(error.response?.data?.message || 'Failed to import roster');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setSpreadsheetUrl('');
    setImportResult(null);
    setUseAI(false);
    setImportMode('file');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Roster" size="md" headerClassName="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white flex items-center justify-between px-6 py-4 rounded-t-lg">
      <div>
        <div className="space-y-6">
          {/* Information */}
          <div className="bg-[#D8DAED] border border-[#454D7C] rounded-lg p-3">
            <p className="text-sm text-[#222E6A]">
              Import roster from Excel file or Google Spreadsheet URL. Use AI parser for flexible format support.
            </p>
          </div>

        <div>
          {/* Import Mode Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => setImportMode('file')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                importMode === 'file'
                  ? 'border-[#454D7C] text-[#454D7C]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setImportMode('url')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                importMode === 'url'
                  ? 'border-[#454D7C] text-[#454D7C]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Link className="h-4 w-4" />
              Spreadsheet URL
            </button>
          </div>

          {/* AI Mode Toggle */}
          <div className="mb-4 p-3 bg-[#D8DAED] rounded-lg border border-[#454D7C]">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAI}
                      onChange={(e) => setUseAI(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#454D7C]/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#454D7C]"></div>
                    <div className="ms-3 flex items-center gap-2">
                      <Sparkles className={`h-4 w-4 ${useAI ? 'text-[#454D7C]' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${useAI ? 'text-[#222E6A]' : 'text-gray-600'}`}>
                        Smart AI Parser
                      </span>
                    </div>
                  </label>
                  <p className="mt-1 text-xs text-gray-500 ml-14">
                    {useAI 
                      ? '✨ AI will intelligently parse any Excel format' 
                      : 'Use standard parser (requires specific format)'}
                  </p>
                </div>

          {/* File Upload Mode */}
          {importMode === 'file' && (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                selectedFile 
                  ? 'border-[#454D7C] bg-[#D8DAED]' 
                  : 'border-gray-300 hover:border-[#454D7C] bg-gray-50'
              }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-[#454D7C]" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setImportResult(null);
                          }}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                <>
                  <FileSpreadsheet className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    <span className="text-[#454D7C] font-medium">Click to upload</span> or drag and drop
                  </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Excel files only (.xlsx, .xls)
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* URL Input Mode */}
                {importMode === 'url' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Google Spreadsheet URL
                      </label>
                      <input
                        type="url"
                        value={spreadsheetUrl}
                        onChange={(e) => {
                          setSpreadsheetUrl(e.target.value);
                          setImportResult(null);
                        }}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#454D7C] text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Make sure the spreadsheet is set to "Anyone with the link can view"
                      </p>
                    </div>
                    <div className="p-3 bg-[#D8DAED] rounded-lg border border-[#454D7C]">
                      <p className="text-xs text-[#222E6A] font-medium">
                        <strong>Supported formats:</strong>
                      </p>
                      <ul className="text-xs text-[#454D7C] mt-1 space-y-0.5">
                        <li>• https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit</li>
                        <li>• https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/view</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className={`mt-4 p-4 rounded-lg ${
                    importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {importResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          importResult.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {importResult.message}
                        </p>
                        {importResult.stats && (
                          <div className="mt-2 text-xs text-gray-600 space-y-1">
                            <p>• Employees processed: {importResult.stats.employees_processed}</p>
                            <p>• New employees created: {importResult.stats.employees_created}</p>
                            <p>• Assignments created: {importResult.stats.assignments_created}</p>
                            {importResult.stats.assignments_skipped > 0 && (
                              <p>• Assignments updated: {importResult.stats.assignments_skipped}</p>
                            )}
                            {importResult.stats.errors.length > 0 && (
                              <div className="mt-2 text-red-600">
                                <p className="font-medium">Errors:</p>
                                {importResult.stats.errors.map((err, i) => (
                                  <p key={i}>- {err}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t w-full -mx-6 px-6 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            {importResult?.success ? 'Close' : 'Cancel'}
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={(importMode === 'file' ? !selectedFile : !spreadsheetUrl) || isLoading}
            variant="primary"
            isLoading={isLoading}
            leftIcon={!isLoading ? <Upload /> : undefined}
            className="flex-1 bg-[#222E6A] hover:bg-[#1a2452]"
          >
            {isLoading ? 'Importing...' : 'Import Roster'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const RostersPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    rosters, 
    loadingStates,
    refreshRosters 
  } = useDataCache();

  // Only Admin, Manager Teknik, General Manager can create/edit/delete rosters
  const canManageRoster = ['Admin', 'Manager Teknik', 'General Manager'].includes(user?.role || '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSwapShiftModalOpen, setIsSwapShiftModalOpen] = useState(false);
  const [isConfigureSwapShiftModalOpen, setIsConfigureSwapShiftModalOpen] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState<RosterPeriod | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<'all' | number>('all');
  const [syncingRosterId, setSyncingRosterId] = useState<number | null>(null);
  const [pushingRosterId, setPushingRosterId] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleCreateSuccess = () => {
    refreshRosters(); // Refresh cached rosters after successful creation
  };

  const handleImportSuccess = () => {
    refreshRosters(); // Refresh cached rosters after successful import
  };

  const handleEditSuccess = () => {
    refreshRosters(); // Refresh cached rosters after successful edit
  };

  const handleDeleteSuccess = () => {
    refreshRosters(); // Refresh cached rosters after successful delete
  };

  const handleSwapShiftSuccess = () => {
    // Placeholder for future functionality
    console.log('Shift swap request submitted');
  };

  const handleConfigureSwapShiftSuccess = () => {
    // Placeholder for future functionality
    console.log('Swap shift rules saved');
  };

  const handleSyncRoster = async (roster: RosterPeriod) => {
    if (!roster.spreadsheet_url) {
      toast.error('This roster is not linked to a spreadsheet');
      return;
    }

    setSyncingRosterId(roster.id);
    
    try {
      const result = await rosterService.syncRoster(roster.id);
      toast.success(`Roster synced! Updated: ${result.data.stats.assignments_updated}, Created: ${result.data.stats.assignments_created}`);
      refreshRosters();
    } catch (error: any) {
      console.error('Failed to sync roster:', error);
      toast.error(error.response?.data?.message || 'Failed to sync roster');
    } finally {
      setSyncingRosterId(null);
    }
  };

  const handlePushToSpreadsheet = async (roster: RosterPeriod) => {
    if (!roster.spreadsheet_url) {
      toast.error('This roster is not linked to a spreadsheet');
      return;
    }

    setPushingRosterId(roster.id);
    
    try {
      const result = await rosterService.pushToSpreadsheet(roster.id);
      toast.success(`Data pushed to spreadsheet! ${result.data.sync_result.updated_cells} cells updated`);
      refreshRosters();
    } catch (error: any) {
      console.error('Failed to push to spreadsheet:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to push to spreadsheet');
    } finally {
      setPushingRosterId(null);
    }
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const openImportModal = () => {
    setIsImportModalOpen(true);
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
  };

  const openEditModal = (roster: RosterPeriod) => {
    setSelectedRoster(roster);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedRoster(null);
  };

  const openDeleteModal = (roster: RosterPeriod) => {
    setSelectedRoster(roster);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedRoster(null);
  };

  const badgeByStatus: Record<string, string> = {
    published: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-800',
    default: 'bg-gray-100 text-gray-700'
  };

  const draftCount = rosters.filter(r => r.status === 'draft').length;
  const publishedCount = rosters.filter(r => r.status === 'published').length;

  const uniqueYears = Array.from(new Set(rosters.map(r => r.year))).sort((a, b) => a - b);

  const lastUpdated = rosters.reduce<string | null>((acc, r) => {
    const ts = (r as any).updated_at || (r as any).published_at || (r as any).created_at;
    if (!ts) return acc;
    const time = new Date(ts).getTime();
    if (!acc) return ts;
    return time > new Date(acc).getTime() ? ts : acc;
  }, null);

  const filteredRosters = rosters.filter(r => {
    const matchStatus = statusFilter === 'all' ? true : r.status === statusFilter;
    const matchYear = yearFilter === 'all' ? true : r.year === yearFilter;
    const monthYear = `${new Date(0, r.month - 1).toLocaleString('default', { month: 'long' })} ${r.year}`;
    const matchSearch = monthYear.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchYear && matchSearch;
  });

  return (
    <PageHeader
      title="Roster Management"
      subtitle="Create and manage work schedules and rosters"
      breadcrumbs={[
        { label: 'Roster Management', href: '/rosters' }
      ]}
    >
      {/* Header Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#222E6A]" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Rosters</h2>
              <p className="text-gray-600 text-sm">{rosters.length} roster{rosters.length !== 1 ? 's' : ''} available</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canManageRoster && (
              <Button
                variant="outline"
                leftIcon={<Settings />}
                onClick={() => setIsConfigureSwapShiftModalOpen(true)}
              >
                Configuration Swap Shift
              </Button>
            )}
            <Button
              variant="secondary"
              leftIcon={<ArrowLeftRight />}
              onClick={() => setIsSwapShiftModalOpen(true)}
            >
              Swap Shift
            </Button>
            {canManageRoster && (
              <>
                <Button
                  variant="success"
                  leftIcon={<Upload />}
                  onClick={openImportModal}
                >
                  Import Roster
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Plus />}
                  onClick={openCreateModal}
                >
                  Create New Roster
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm font-medium text-gray-800">
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Year</span>
            <select
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none"
              value={yearFilter === 'all' ? '' : yearFilter}
              onChange={(e) => setYearFilter(e.target.value === '' ? 'all' : parseInt(e.target.value))}
            >
              <option value="">All</option>
              {uniqueYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Draft Rosters</span>
            <span className="text-gray-900 font-semibold">{draftCount}</span>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Published Rosters</span>
            <span className="text-gray-900 font-semibold">{publishedCount}</span>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Last Update</span>
            <span className="text-gray-600 text-xs sm:text-sm">{lastUpdated ? new Date(lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <span>Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div className="flex-1 w-full">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="text"
              placeholder="Search month or year..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Rosters Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
        {loadingStates.rosters ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#454D7C] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading rosters...</p>
          </div>
        ) : filteredRosters.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-[#D8DAED] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="h-10 w-10 text-[#454D7C]" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Rosters Found</h3>
            <p className="text-gray-600 mb-6">Try adjusting filters or create a new roster.</p>
            {canManageRoster && (
              <button
                onClick={openCreateModal}
                className="bg-[#222E6A] hover:bg-[#1a2550] text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-md hover:shadow-lg inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Roster
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRosters.map((roster) => {
              const label = `${new Date(0, roster.month - 1).toLocaleString('default', { month: 'long' })} ${roster.year}`;
              const badge = badgeByStatus[roster.status] || badgeByStatus.default;
              const hasSpreadsheetLink = !!roster.spreadsheet_url;
              const isSyncing = syncingRosterId === roster.id;
              return (
                <div
                  key={roster.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      {hasSpreadsheetLink && (
                        <span title="Linked to Google Spreadsheet" className="text-green-600">
                          <Link className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${badge}`}>
                      {roster.status ? roster.status.charAt(0).toUpperCase() + roster.status.slice(1) : 'Draft'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 space-y-1 mb-4">
                    <p>Staffing Coverage: 100%</p>
                    <p>Last Edited: {roster.updated_at ? new Date(roster.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                    {roster.last_synced_at && (
                      <p className="text-green-600">Last Synced: {new Date(roster.last_synced_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
                  <div className="mb-2">
                    <button
                      onClick={() => navigate(`/rosters/${roster.id}`)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-800 hover:bg-gray-50"
                    >
                      View
                    </button>
                  </div>
                  {/* Sync button - show if roster has spreadsheet link */}
                  {canManageRoster && hasSpreadsheetLink && roster.status === 'draft' && (
                    <div className="mb-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncRoster(roster);
                        }}
                        disabled={isSyncing}
                        className="w-full text-xs border border-green-300 rounded px-2 py-1.5 text-green-600 hover:bg-green-50 inline-flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync from Spreadsheet'}
                      </button>
                    </div>
                  )}
                  {/* Push to Spreadsheet button - show if roster has spreadsheet link */}
                  {canManageRoster && hasSpreadsheetLink && roster.status === 'draft' && (
                    <div className="mb-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePushToSpreadsheet(roster);
                        }}
                        disabled={pushingRosterId === roster.id}
                        className="w-full text-xs border border-[#454D7C] rounded px-2 py-1.5 text-[#454D7C] hover:bg-[#D8DAED] inline-flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowUpToLine className={`h-3 w-3 ${pushingRosterId === roster.id ? 'animate-pulse' : ''}`} />
                        {pushingRosterId === roster.id ? 'Pushing...' : 'Push to Spreadsheet'}
                      </button>
                    </div>
                  )}
                  {canManageRoster && roster.status === 'draft' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(roster);
                        }}
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit2 />}
                        className="flex-1 text-xs"
                        effect3d={false}
                      >
                        Edit Period
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(roster);
                        }}
                        variant="danger"
                        size="sm"
                        leftIcon={<Trash2 />}
                        className="flex-1 text-xs"
                        effect3d={false}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Create Roster Modal */}
      <CreateRosterModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSuccess={handleCreateSuccess}
      />

      {/* Import Roster Modal */}
      <ImportRosterModal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        onSuccess={handleImportSuccess}
      />

      {/* Edit Roster Modal */}
      <EditRosterModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSuccess={handleEditSuccess}
        roster={selectedRoster}
      />

      {/* Delete Roster Modal */}
      <DeleteRosterModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onSuccess={handleDeleteSuccess}
        roster={selectedRoster}
      />

      {/* Swap Shift Modal */}
      <SwapShiftModal
        isOpen={isSwapShiftModalOpen}
        onClose={() => setIsSwapShiftModalOpen(false)}
        onSuccess={handleSwapShiftSuccess}
      />

      {/* Configure Swap Shift Modal */}
      <ConfigureSwapShiftModal
        isOpen={isConfigureSwapShiftModalOpen}
        onClose={() => setIsConfigureSwapShiftModalOpen(false)}
        onSuccess={handleConfigureSwapShiftSuccess}
      />
    </PageHeader>
  );
};

export default RostersPage;
