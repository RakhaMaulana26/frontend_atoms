import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Input from '../../../components/common/Input';
import PageHeader from '../../../components/layout/PageHeader';
import { Calendar, Plus, X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { useDataCache } from '../../../contexts/DataCacheContext';
import { rosterService } from '../repository/rosterService';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create New Roster Template
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                This will create a roster template with all days for the selected month. 
                You can assign managers and shift employees later.
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
                        {[...Array(12)].map((_, i) => (
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
                      <Input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        min={new Date().getFullYear()}
                        max={new Date().getFullYear() + 2}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#454D7C] text-base font-medium text-white hover:bg-[#222E6A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#454D7C] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Creating Template...' : 'Create Roster Template'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
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

// Import Roster Modal Component
const ImportRosterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setIsLoading(true);
    setImportResult(null);

    try {
      const result = await rosterService.importRoster(selectedFile, useAI);
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
    setImportResult(null);
    setUseAI(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
              <Upload className="h-6 w-6 text-green-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Import Roster from Excel
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Upload an Excel file (.xlsx) containing roster schedule. 
                The system will automatically create roster period and assign shifts to employees.
              </p>
              
              <div className="mt-4">
                {/* AI Mode Toggle */}
                <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAI}
                      onChange={(e) => setUseAI(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    <div className="ms-3 flex items-center gap-2">
                      <Sparkles className={`h-4 w-4 ${useAI ? 'text-purple-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${useAI ? 'text-purple-700' : 'text-gray-600'}`}>
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

                {/* File Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    selectedFile 
                      ? 'border-green-400 bg-green-50' 
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
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
                      <FileSpreadsheet className="h-8 w-8 text-green-600" />
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
                        <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Excel files only (.xlsx, .xls)
                      </p>
                    </>
                  )}
                </div>

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
                
                <div className="mt-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!selectedFile || isLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Roster
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={handleClose}
                  >
                    {importResult?.success ? 'Close' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RostersPage: React.FC = () => {
  const { 
    rosters, 
    loadingStates,
    refreshRosters 
  } = useDataCache();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateSuccess = () => {
    refreshRosters(); // Refresh cached rosters after successful creation
  };

  const handleImportSuccess = () => {
    refreshRosters(); // Refresh cached rosters after successful import
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

  return (
    <PageHeader
      title="Roster Management"
      subtitle="Create and manage work schedules and rosters"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Roster Management', href: '/rosters' }
      ]}
    >
      {/* Header Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#222E6A]" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Rosters</h2>
              <p className="text-gray-600 text-sm">
                {rosters.length} roster{rosters.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openImportModal}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Upload className="h-4 w-4" />
              Import Excel
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-[#222E6A] hover:bg-[#1a2550] text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Roster
            </button>
          </div>
        </div>
      </div>

      {/* Rosters List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loadingStates.rosters ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#454D7C] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading rosters...</p>
          </div>
        ) : rosters.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-[#D8DAED] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="h-10 w-10 text-[#454D7C]" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Rosters Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first roster to get started with shift management
            </p>
            <button 
              onClick={openCreateModal}
            className="bg-[#222E6A] hover:bg-[#1a2550] text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-md hover:shadow-lg inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create First Roster
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rosters.map((roster) => (
            <div 
              key={roster.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => navigate(`/rosters/${roster.id}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {new Date(0, roster.month - 1).toLocaleString('default', { month: 'long' })} {roster.year}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Status: <span className={`font-medium ${
                      roster.status === 'published' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {roster.status.charAt(0).toUpperCase() + roster.status.slice(1)}
                    </span>
                  </p>
                  {roster.published_at && (
                    <p className="text-xs text-gray-500">
                      Published: {new Date(roster.published_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {roster.rosterDays?.length || 0} days
                  </span>
                </div>
              </div>
            </div>
          ))}
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
    </PageHeader>
  );
};

export default RostersPage;
