import React, { useState } from 'react';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { Calendar, Plus } from 'lucide-react';

const RostersPage: React.FC = () => {
  const [rosters] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rosters</h1>
          <p className="text-gray-600 mt-1">Manage monthly shift rosters</p>
        </div>
        <Button variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          Create Roster
        </Button>
      </div>

      <Card>
        {rosters.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Rosters Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first roster to get started with shift management
            </p>
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Create First Roster
            </Button>
          </div>
        ) : (
          <div>Roster list will appear here</div>
        )}
      </Card>
    </div>
  );
};

export default RostersPage;
