import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import type { LeaveRequest } from '../types/leaveRequest';
import { leaveRequestService } from '../repository/leaveRequestService';
import LeaveRequestApprovalModal from '../../../components/modals/roster/LeaveRequestApprovalModal';

interface LeaveRequestsTableProps {
  statusFilter?: 'pending' | 'approved' | 'rejected' | 'all';
  refreshTrigger?: number;
}

const LeaveRequestsTable: React.FC<LeaveRequestsTableProps> = ({ statusFilter = 'all', refreshTrigger }) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLeaveRequests();
  }, [statusFilter, currentPage, refreshTrigger]);

  const fetchLeaveRequests = async () => {
    setIsLoading(true);
    try {
      const response = await leaveRequestService.getLeaveRequests({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: currentPage,
        per_page: 15,
      });

      setLeaveRequests(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error: any) {
      console.error('Failed to fetch leave requests:', error);
      toast.error('Gagal memuat data permohonan cuti');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleApprovalSuccess = () => {
    fetchLeaveRequests(); // Refresh the list
  };

  const getLeaveTypeLabel = (request: LeaveRequest) => {
    if (request.request_type === 'doctor_leave') {
      return 'Cuti Sakit';
    }

    if (request.request_type === 'annual_leave') {
      return 'Cuti Kepentingan';
    }

    if (request.request_type === 'external_duty') {
      return request.institution ? `TPO - ${request.institution}` : 'TPO';
    }

    return request.request_type_name;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'approved') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    } else if (status === 'rejected') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (leaveRequests.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada permohonan cuti</h3>
        <p className="mt-1 text-sm text-gray-500">
          {statusFilter === 'pending' ? 'Belum ada permohonan cuti yang menunggu persetujuan' : 'Tidak ada data untuk ditampilkan'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden space-y-3">
        {leaveRequests.map((request) => (
          <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{request.employee?.user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{request.employee?.user?.email}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${getStatusBadge(request.status)}`}>
                {getStatusIcon(request.status)}
                {request.status_name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div>
                <p className="text-gray-500">Jenis Cuti</p>
                <p className="font-medium text-gray-900 mt-0.5">{getLeaveTypeLabel(request)}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Hari</p>
                <p className="font-medium text-gray-900 mt-0.5">{request.total_days} hari</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Periode</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {new Date(request.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} -{' '}
                  {new Date(request.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Tanggal Pengajuan</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {new Date(request.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleViewDetail(request)}
              className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              {request.status === 'pending' ? 'Proses Permohonan' : 'Lihat Detail'}
            </button>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Karyawan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jenis Cuti
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Periode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Hari
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tanggal Pengajuan
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaveRequests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {request.employee?.user?.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {request.employee?.user?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.employee?.user?.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{getLeaveTypeLabel(request)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(request.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} -{' '}
                    {new Date(request.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{request.total_days} hari</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                    {getStatusIcon(request.status)}
                    {request.status_name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(request.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleViewDetail(request)}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    {request.status === 'pending' ? 'Proses' : 'Lihat Detail'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-4 px-1 sm:px-4">
          <div className="text-sm text-gray-700">
            Halaman {currentPage} dari {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      <LeaveRequestApprovalModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        leaveRequest={selectedRequest}
        onSuccess={handleApprovalSuccess}
      />
    </>
  );
};

export default LeaveRequestsTable;
