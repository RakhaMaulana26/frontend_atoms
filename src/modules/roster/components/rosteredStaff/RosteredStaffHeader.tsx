import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type RosteredStaffHeaderProps = {
  showFullMonth: boolean;
  currentWeek: number;
  totalWeeks: number;
  title: string;
  subtitle: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onPrint: () => void;
};

const RosteredStaffHeader: React.FC<RosteredStaffHeaderProps> = ({
  showFullMonth,
  currentWeek,
  totalWeeks,
  title,
  subtitle,
  onPrevWeek,
  onNextWeek,
  onPrint,
}) => {
  return (
    <div className="flex items-center justify-between mb-6 gap-2">
      {showFullMonth ? (
        <div className="w-9 sm:w-10" />
      ) : (
        <button
          onClick={onPrevWeek}
          disabled={currentWeek === 0}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
            currentWeek === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      <div className="text-center flex-1 min-w-0">
        <h2 className="text-lg sm:text-3xl font-bold text-gray-900">Rostered Staff</h2>
        <p className="text-xs sm:text-lg text-gray-500 truncate">{title}</p>
        <p className="text-[10px] sm:text-lg text-gray-400 mt-1">{subtitle}</p>
      </div>

      {showFullMonth ? (
        <button
          onClick={onPrint}
          className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#222E6A] hover:bg-[#1a2352] transition-colors flex-shrink-0"
          title="Print roster"
        >
          Print
        </button>
      ) : (
        <div className="flex flex-col items-center gap-1 sm:gap-1.5">
          <button
            onClick={onNextWeek}
            disabled={currentWeek === totalWeeks - 1}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              currentWeek === totalWeeks - 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={onPrint}
            className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#222E6A] hover:bg-[#1a2352] transition-colors flex-shrink-0"
            title="Print roster"
          >
            Print
          </button>
        </div>
      )}
    </div>
  );
};

export default RosteredStaffHeader;
