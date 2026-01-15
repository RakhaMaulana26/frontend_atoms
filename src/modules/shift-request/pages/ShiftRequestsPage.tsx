import React, { useState } from 'react';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { RefreshCw, Plus } from 'lucide-react';

const ShiftRequestsPage: React.FC = () => {
  const [requests] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Requests</h1>
          <p className="text-gray-600 mt-1">Manage shift swap requests</p>
        </div>
        <Button variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      <Card>
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Shift Requests</h3>
            <p className="text-gray-600 mb-6">
              Create a shift swap request when you need to change your schedule
            </p>
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Request
            </Button>
          </div>
        ) : (
          <div>Shift requests will appear here</div>
        )}
      </Card>
    </div>
  );
};

export default ShiftRequestsPage;
