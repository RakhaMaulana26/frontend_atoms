/**
 * ShiftSwapRequestsTable Component
 * 
 * Table displaying shift swap requests with filters
 */

import React, { useState } from 'react';

interface ShiftSwapRequest {
  id: number;
  type: string;
  employee: {
    name: string;
    position: string;
  };
  originalShift: string;
  requestedShift: string;
  submittedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

interface ShiftSwapRequestsTableProps {
  requests: ShiftSwapRequest[];
  onRequestNew?: () => void;
}

const ShiftSwapRequestsTable: React.FC<ShiftSwapRequestsTableProps> = ({
  requests,
  onRequestNew
}) => {
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter requests based on search
  const filteredRequests = requests.filter(req =>
    req.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.employee.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Request Button */}
      {onRequestNew && (
        <div className="mb-4 sm:mb-6 px-2">
          <button 
            onClick={onRequestNew}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#222E6A] hover:bg-[#1a235c] rounded-lg transition-colors font-medium text-white text-sm sm:text-base"
          >
            <span className="text-lg sm:text-xl">+</span>
            <span>Request Shift Swap</span>
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 -mx-7 sm:mx-0 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Shift Swap Request List</h3>
          <p className="text-xs sm:text-sm text-gray-600">
            The following is a list of submitted requests and their verification status
          </p>
        </div>

        {/* Filter and Search */}
        <div className="rounded-t-xl p-3 sm:p-6 bg-[#222E6A]">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white text-xs sm:text-sm font-medium whitespace-nowrap">Items per page</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium text-xs sm:text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 text-xs sm:text-sm w-32 sm:w-auto"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="relative">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#454D7C]">
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                    Request Type
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                    Name & Position
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                    Original Shift
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                    Requested Shift
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                    Submitted
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-6 sm:py-8 text-center text-gray-500 text-sm">
                      No shift swap requests found
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 font-medium">
                        {request.type}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{request.employee.name}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">{request.employee.position}</p>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                        {request.originalShift}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                        {request.requestedShift}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                        {request.submittedDate}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                        <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Scroll Indicator */}
          <div className="sm:hidden flex items-center justify-center py-2 bg-gray-50 border-t border-gray-200">
            <svg className="w-4 h-4 text-gray-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <span className="ml-2 text-xs text-gray-500 font-medium">Swipe to see more</span>
          </div>
        </div>

        {/* Pagination */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs sm:text-sm text-gray-600">
            Showing 1 to {Math.min(itemsPerPage, filteredRequests.length)} of {filteredRequests.length} entries
          </span>
          <div className="flex items-center gap-1 sm:gap-2">
            <button className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#222E6A] text-white rounded-lg font-medium text-xs sm:text-sm">1</button>
            <button className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftSwapRequestsTable;
