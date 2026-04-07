/**
 * Shift Constants & Utilities
 * Defines shift keys, labels, times, and helper functions
 */

export type ShiftKey = '07-13' | '13-19' | '19-07';

export interface ShiftInfo {
  key: ShiftKey;
  label: string;
  labelId: string;
  startTime: string;
  endTime: string;
  order: number;
}

export const SHIFTS: Record<ShiftKey, ShiftInfo> = {
  '07-13': {
    key: '07-13',
    label: 'Pagi',
    labelId: 'pagi',
    startTime: '07:00',
    endTime: '13:00',
    order: 1,
  },
  '13-19': {
    key: '13-19',
    label: 'Siang',
    labelId: 'siang',
    startTime: '13:00',
    endTime: '19:00',
    order: 2,
  },
  '19-07': {
    key: '19-07',
    label: 'Malam',
    labelId: 'malam',
    startTime: '19:00',
    endTime: '07:00',
    order: 3,
  },
};

/**
 * Get shift info by key
 */
export const getShiftInfo = (shiftKey: ShiftKey | string): ShiftInfo | null => {
  return SHIFTS[shiftKey as ShiftKey] || null;
};

/**
 * Get shift label
 */
export const getShiftLabel = (shiftKey: ShiftKey | string): string => {
  return SHIFTS[shiftKey as ShiftKey]?.label || shiftKey || 'Unknown';
};

/**
 * Get all shifts sorted by order
 */
export const getAllShiftsSorted = (): ShiftInfo[] => {
  return Object.values(SHIFTS).sort((a, b) => a.order - b.order);
};

/**
 * Format shift display string
 */
export const formatShiftDisplay = (shiftKey: ShiftKey | string): string => {
  const shift = SHIFTS[shiftKey as ShiftKey];
  if (!shift) return shiftKey || 'Unknown';
  return `${shift.label} (${shift.startTime}-${shift.endTime})`;
};
