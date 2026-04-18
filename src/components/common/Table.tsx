import { useRef, useEffect, useState, type ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
}

function Table<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No data available',
}: TableProps<T>) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  useEffect(() => {
    const tableScroll = tableScrollRef.current;
    const topScroll = topScrollRef.current;
    const thumb = thumbRef.current;

    if (!tableScroll || !topScroll || !thumb) return;

    // Check if table is scrollable and update thumb width
    const checkScrollable = () => {
      const isScrollable = tableScroll.scrollWidth > tableScroll.clientWidth;
      setShowScrollIndicator(isScrollable);
      
      if (isScrollable) {
        // Calculate thumb width as percentage of visible area
        const visibleRatio = tableScroll.clientWidth / tableScroll.scrollWidth;
        const thumbWidth = Math.max(visibleRatio * 100, 20); // Minimum 20%
        thumb.style.width = `${thumbWidth}%`;
      }
    };

    checkScrollable();
    window.addEventListener('resize', checkScrollable);

    // Sync scroll between top scrollbar and table
    const handleTopScroll = () => {
      if (tableScroll && topScroll && thumb) {
        const scrollRatio = topScroll.scrollLeft / (topScroll.scrollWidth - topScroll.clientWidth);
        const maxScrollLeft = tableScroll.scrollWidth - tableScroll.clientWidth;
        tableScroll.scrollLeft = scrollRatio * maxScrollLeft;
      }
    };

    const handleTableScroll = () => {
      if (tableScroll && topScroll && thumb) {
        const scrollRatio = tableScroll.scrollLeft / (tableScroll.scrollWidth - tableScroll.clientWidth);
        const maxScrollLeft = topScroll.scrollWidth - topScroll.clientWidth;
        topScroll.scrollLeft = scrollRatio * maxScrollLeft;
      }
    };

    topScroll.addEventListener('scroll', handleTopScroll);
    tableScroll.addEventListener('scroll', handleTableScroll);

    return () => {
      window.removeEventListener('resize', checkScrollable);
      topScroll?.removeEventListener('scroll', handleTopScroll);
      tableScroll?.removeEventListener('scroll', handleTableScroll);
    };
  }, [data, columns]);

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="overflow-x-auto">
        <div className="text-center py-12 text-gray-500">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Scrollbar Indicator - Visible on mobile/tablet when table is scrollable */}
      {showScrollIndicator && (
        <div className="lg:hidden px-4 sm:px-6 pb-3 bg-white">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg 
              className="w-4 h-4 text-blue-500 animate-pulse" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span className="text-xs font-medium text-gray-700">Scroll untuk melihat lebih banyak</span>
            <svg 
              className="w-4 h-4 text-blue-500 animate-pulse" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
          <div 
            ref={topScrollRef}
            className="overflow-x-auto bg-gray-200 rounded-full cursor-grab active:cursor-grabbing"
            style={{ 
              overflowY: 'hidden',
              height: '14px',
            }}
          >
            <div 
              ref={thumbRef}
              className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full shadow-sm transition-all" 
              style={{ minWidth: '40%', height: '14px' }}
            ></div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div ref={tableScrollRef} className="overflow-x-auto overflow-y-visible">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row) => (
              <tr key={keyExtractor(row)} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(row) : (row as any)[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;
