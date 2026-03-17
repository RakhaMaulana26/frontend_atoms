/**
 * ShiftEditorToolbar Component
 * 
 * A toolbar for editing shift assignments with options for:
 * - Quick shift selection (P/S/M/L)
 * - Auto-fill pattern toggle
 * - Apply to group toggle
 * - Custom text input
 */

import React, { useRef, useEffect } from 'react';
import type { ShiftOption } from './PersonViewTypes';

interface ShiftEditorToolbarProps {
  position: { top: number; left: number };
  selectedCount: number;
  shiftOptions: ShiftOption[];
  customText: string;
  autoFillPattern: boolean;
  applyToGroup: boolean;
  onCustomTextChange: (text: string) => void;
  onAutoFillPatternChange: (enabled: boolean) => void;
  onApplyToGroupChange: (enabled: boolean) => void;
  onShiftSelect: (optionValue: string, customNote?: string) => void;
  onClose: () => void;
  onClear?: () => void;
  showPatternOptions?: boolean;
}

const ShiftEditorToolbar: React.FC<ShiftEditorToolbarProps> = ({
  position,
  selectedCount,
  shiftOptions,
  customText,
  autoFillPattern,
  applyToGroup,
  onCustomTextChange,
  onAutoFillPatternChange,
  onApplyToGroupChange,
  onShiftSelect,
  onClose,
  onClear,
  showPatternOptions = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleShiftClick = (optionValue: string) => {
    onShiftSelect(optionValue);
  };

  const handleCustomSubmit = () => {
    if (customText.trim()) {
      onShiftSelect(shiftOptions[0]?.value || 'pagi', customText.trim());
      onCustomTextChange('');
    }
  };

  return (
    <div 
      className="fixed z-50 transition-all duration-200 ease-out"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-lg shadow-2xl border-2 border-[#222E6A] p-4 min-w-[320px] max-w-[400px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-gray-800">
            {selectedCount === 1 ? 'Edit Shift' : `${selectedCount} cell dipilih`}
          </div>
          {onClear && selectedCount > 1 ? (
            <button
              onClick={onClear}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded"
            >
              Clear
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded"
            >
              ✕
            </button>
          )}
        </div>

        {/* Auto-fill Pattern Toggle - show when single cell */}
        {showPatternOptions && selectedCount === 1 && (
          <div className="mb-3 space-y-2">
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoFillPattern}
                  onChange={(e) => onAutoFillPatternChange(e.target.checked)}
                  className="w-4 h-4 text-[#222E6A] border-gray-300 rounded focus:ring-[#222E6A] focus:ring-2"
                />
                <span className="ml-2 text-xs font-medium text-gray-700">
                  Isi Otomatis Pattern (S→P→M→L→L)
                </span>
              </label>
              {autoFillPattern && (
                <p className="mt-1 text-[10px] text-gray-600 ml-6">
                  Pattern akan mengisi dari cell ini sampai akhir bulan
                </p>
              )}
            </div>

            <div className="p-2 bg-green-50 rounded-lg border border-green-200">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToGroup}
                  onChange={(e) => onApplyToGroupChange(e.target.checked)}
                  className="w-4 h-4 text-[#222E6A] border-gray-300 rounded focus:ring-[#222E6A] focus:ring-2"
                />
                <span className="ml-2 text-xs font-medium text-gray-700">
                  Terapkan ke Semua Grup
                </span>
              </label>
              {applyToGroup && !autoFillPattern && (
                <p className="mt-1 text-[10px] text-gray-600 ml-6">
                  Akan mengubah semua karyawan dalam grup untuk tanggal ini
                </p>
              )}
              {applyToGroup && autoFillPattern && (
                <p className="mt-1 text-[10px] text-gray-600 ml-6">
                  Akan mengubah semua karyawan dalam grup dengan pattern sampai akhir bulan
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Shift Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {shiftOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleShiftClick(option.value)}
              className="px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-[#222E6A] hover:text-white rounded transition-colors text-center"
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Custom Text Input */}
        <div className="border-t pt-3">
          <input
            ref={inputRef}
            type="text"
            value={customText}
            onChange={(e) => onCustomTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCustomSubmit();
              }
            }}
            placeholder={selectedCount > 1 ? "Custom text untuk semua cell..." : "Ketik custom (CT, CS, DL, OH, dll)..."}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-[#222E6A] mb-2"
          />
          {customText.trim() && (
            <button
              onClick={handleCustomSubmit}
              className="w-full px-3 py-2 text-xs font-medium bg-[#222E6A] text-white rounded hover:bg-[#1a2350] transition-colors"
            >
              {selectedCount > 1 ? `Terapkan ke ${selectedCount} cell` : 'Simpan'}
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-3 text-[10px] text-gray-500 text-center">
          Drag untuk pilih banyak | Klik cell untuk edit langsung
        </div>
      </div>
    </div>
  );
};

export default ShiftEditorToolbar;
