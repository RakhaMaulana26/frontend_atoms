import React from 'react';

type SectionTableDividerRowsProps = {
  isFirstSection: boolean;
  showColumnsHeader: boolean;
  totalColSpan: number;
  displayedDays: number[];
  dayNames: string[];
  stickyNameWidth: number;
  stickyGradeWidth: number;
  stickyRoleWidth: number;
  stickyGradeLeft: number;
  stickyRoleLeft: number;
  dayColumnWidth: number;
  showFullMonth: boolean;
  shortageDays: Set<number>;
  shortageDetailsByDay: Map<number, Array<{ shiftLabel: string; missingRoles: string[] }>>;
  onShortageDayClick: (day: number) => void;
  shouldStickyMetaColumns: boolean;
};

const SectionTableDividerRows: React.FC<SectionTableDividerRowsProps> = ({
  isFirstSection,
  showColumnsHeader,
  totalColSpan,
  displayedDays,
  dayNames,
  stickyNameWidth,
  stickyGradeWidth,
  stickyRoleWidth,
  stickyGradeLeft,
  stickyRoleLeft,
  dayColumnWidth,
  showFullMonth,
  shortageDays,
  shortageDetailsByDay,
  onShortageDayClick,
  shouldStickyMetaColumns,
}) => {
  return (
    <>
      {!isFirstSection && (
        <tr>
          <td colSpan={totalColSpan} className="h-4 sm:h-5 bg-white border-0"></td>
        </tr>
      )}

      {showColumnsHeader && (
        <tr className="print-section-columns-header">
          <td
            className="text-left text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap sticky left-0 z-30"
            style={{
              backgroundColor: '#222E6A',
              width: `${stickyNameWidth}px`,
              minWidth: `${stickyNameWidth}px`,
              maxWidth: `${stickyNameWidth}px`,
              boxSizing: 'border-box',
            }}
          >
            Name
          </td>
          <td
            className={`text-center text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap ${shouldStickyMetaColumns ? 'sticky z-30' : 'z-0'}`}
            style={{
              backgroundColor: '#222E6A',
              ...(shouldStickyMetaColumns ? { left: `${stickyGradeLeft}px` } : {}),
              width: `${stickyGradeWidth}px`,
              minWidth: `${stickyGradeWidth}px`,
              maxWidth: `${stickyGradeWidth}px`,
              boxSizing: 'border-box',
            }}
          >
            Kelas
          </td>
          <td
            className={`text-center text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap ${shouldStickyMetaColumns ? 'sticky z-30' : 'z-0'}`}
            style={{
              backgroundColor: '#222E6A',
              ...(shouldStickyMetaColumns ? { left: `${stickyRoleLeft}px` } : {}),
              width: `${stickyRoleWidth}px`,
              minWidth: `${stickyRoleWidth}px`,
              maxWidth: `${stickyRoleWidth}px`,
              boxSizing: 'border-box',
            }}
          >
            Jabatan
          </td>
          {displayedDays.map((day, index) => (
            <td
              key={`section-day-${day}-${index}`}
              className={`text-center font-semibold text-white ${showFullMonth ? 'px-1 py-2 text-[10px]' : 'px-1.5 py-2 text-[9px] sm:text-xs lg:text-sm sm:px-3 sm:py-3'} ${shortageDays.has(day) ? 'cursor-pointer' : ''}`}
              style={{
                backgroundColor: shortageDays.has(day) ? '#dc2626' : '#222E6A',
                width: `${dayColumnWidth}px`,
                minWidth: `${dayColumnWidth}px`,
                maxWidth: `${dayColumnWidth}px`,
                boxSizing: 'border-box',
              }}
              onClick={() => {
                if (shortageDays.has(day)) {
                  onShortageDayClick(day);
                }
              }}
              title={shortageDays.has(day)
                ? `Klik untuk lihat kekurangan: ${(
                    shortageDetailsByDay.get(day) || []
                  )
                    .map((item) => `${item.shiftLabel} (${item.missingRoles.join(', ')})`)
                    .join(' | ')}`
                : undefined}
            >
              <div className={`${showFullMonth ? 'text-[8px]' : 'text-[7px] sm:text-[10px]'} text-white/70 leading-none`}>{dayNames[index]}</div>
              <div className="font-bold leading-none mt-0.5">{day}</div>
            </td>
          ))}
          <td className="w-6 sm:w-12" style={{ backgroundColor: '#222E6A' }}></td>
        </tr>
      )}
    </>
  );
};

export default SectionTableDividerRows;
