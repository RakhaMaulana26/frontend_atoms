/**
 * RosterLegend Component
 * 
 * Displays shift and status legend at the bottom of the roster view
 */

import React from 'react';

const RosterLegend: React.FC = () => {
  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-4 text-center">
        Keterangan Shift & Status
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shift Legend */}
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-emerald-600 rounded"></div>
            Shift Kerja
          </h4>
          <div className="space-y-2">
            <LegendItem color="bg-blue-500" textColor="text-white" label="Pagi" time="07:00 - 13:00 / 07:00 - 15:00" />
            <LegendItem color="bg-orange-500" textColor="text-white" label="Siang" time="13:00 - 19:00 / 15:00 - 23:00" />
            <LegendItem color="bg-emerald-600" textColor="text-white" label="Malam" time="19:00 - 07:00 / 23:00 - 07:00" />
          </div>
        </div>

        {/* Status Legend */}
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-red-400 rounded"></div>
            Status Karyawan
          </h4>
          <div className="grid grid-cols-1 gap-2">
            <StatusItem color="bg-slate-400" textColor="text-white" code="L" label="Libur" />
            <StatusItem color="bg-amber-400" textColor="text-gray-900" code="CT" label="Cuti Tahunan" />
            <StatusItem color="bg-rose-500" textColor="text-white" code="CS" label="Cuti Sakit / Cuti Dokter" />
            <StatusItem color="bg-teal-500" textColor="text-white" code="DL" label="Dinas Luar" />
            <StatusItem color="bg-cyan-500" textColor="text-white" code="OH" label="Office Hour (08:00 - 17:00)" />
            <StatusItem color="bg-purple-500" textColor="text-white" code="SC" label="Standby On Call" />
            <StatusItem color="bg-gray-600" textColor="text-white" code="-" label="Lepas Dinas Malam" />
            <StatusItem color="bg-indigo-500" textColor="text-white" code="TB" label="Tugas Belajar" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface LegendItemProps {
  color: string;
  textColor: string;
  label: string;
  time: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ color, textColor, label, time }) => (
  <div className="flex items-center gap-3 text-xs sm:text-sm">
    <div className={`w-16 h-7 rounded-lg ${color} ${textColor} shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs`}>
      {label}
    </div>
    <div className="flex-1">
      <div className="font-medium text-gray-800">{label}</div>
      <div className="text-[10px] sm:text-xs text-gray-500">{time}</div>
    </div>
  </div>
);

interface StatusItemProps {
  color: string;
  textColor: string;
  code: string;
  label: string;
}

const StatusItem: React.FC<StatusItemProps> = ({ color, textColor, code, label }) => (
  <div className="flex items-center gap-3 text-xs sm:text-sm">
    <div className={`w-16 h-7 rounded-lg ${color} ${textColor} shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs`}>
      {code}
    </div>
    <span className="text-gray-700">{label}</span>
  </div>
);

export default RosterLegend;
