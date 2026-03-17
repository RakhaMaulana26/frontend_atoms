/**
 * Helper functions for Person View components
 */

import type { Shift } from '../../types/roster';
import type { ShiftOption } from './PersonViewTypes';

/**
 * Get shift options from available shifts
 */
export const getShiftOptions = (shifts: Shift[]): ShiftOption[] => {
  const pagiShift = shifts.find(s => s.name.toLowerCase().includes('pagi'));
  const siangShift = shifts.find(s => s.name.toLowerCase().includes('siang'));
  const malamShift = shifts.find(s => s.name.toLowerCase().includes('malam'));
  const liburShift = shifts.find(s => s.name.toLowerCase().includes('libur'));

  const options: ShiftOption[] = [];
  
  if (pagiShift) {
    options.push({ 
      label: 'P - Pagi', 
      value: 'pagi', 
      shiftId: pagiShift.id,
      notes: 'P',
    });
  }
  
  if (siangShift) {
    options.push({ 
      label: 'S - Siang', 
      value: 'siang', 
      shiftId: siangShift.id,
      notes: 'S',
    });
  }
  
  if (malamShift) {
    options.push({ 
      label: 'M - Malam', 
      value: 'malam', 
      shiftId: malamShift.id,
      notes: 'M',
    });
  }
  
  const baseShift = liburShift || shifts[0];
  if (baseShift) {
    options.push({ 
      label: 'L - Libur', 
      value: 'libur1', 
      shiftId: baseShift.id,
      notes: 'L',
    });
    options.push({ 
      label: 'L - Libur', 
      value: 'libur2', 
      shiftId: baseShift.id,
      notes: 'L',
    });
  }

  return options;
};

/**
 * Get CSS classes based on shift name
 */
export const getShiftClasses = (shiftName: string): string => {
  const name = shiftName.toLowerCase();
  if (name.includes('morning') || name.includes('pagi') || name.includes('shift 1')) return 'bg-blue-500 text-white font-semibold';
  if (name.includes('afternoon') || name.includes('siang') || name.includes('shift 2')) return 'bg-orange-500 text-white font-semibold';
  if (name.includes('night') || name.includes('malam') || name.includes('shift 3')) return 'bg-emerald-600 text-white font-semibold';
  return 'bg-gray-600 text-white font-semibold';
};

/**
 * Get CSS classes based on notes
 */
export const getNotesClasses = (notes: string): string => {
  const note = notes.toLowerCase().trim();
  
  // Shift reguler
  if (note === 'pagi' || note === 'p') return 'bg-blue-500 text-white font-semibold';
  if (note === 'siang' || note === 's') return 'bg-orange-500 text-white font-semibold';
  if (note === 'malam' || note === 'm') return 'bg-emerald-600 text-white font-semibold';
  
  // Status karyawan
  if (note === 'l' || note === 'libur' || note === 'off') return 'bg-slate-400 text-white font-semibold';
  if (note === 'ct' || note === 'cuti tahunan') return 'bg-amber-400 text-gray-900 font-semibold';
  if (note === 'cs' || note === 'cuti sakit' || note === 'cuti dokter') return 'bg-rose-500 text-white font-semibold';
  if (note === 'oh' || note === 'office hour') return 'bg-cyan-500 text-white font-semibold';
  if (note === 'dl' || note === 'dinas luar') return 'bg-teal-500 text-white font-semibold';
  if (note === 'tb' || note === 'tugas belajar') return 'bg-indigo-500 text-white font-semibold';
  if (note === '-' || note === 'lepas malam' || note === 'lepas dinas malam') return 'bg-gray-600 text-white font-semibold';
  if (note === 'sc' || note === 'standby on call' || note === 'stby') return 'bg-purple-500 text-white font-semibold';
  if (note === 's/p' || note === 'standby pagi') return 'bg-violet-500 text-white font-semibold';
  if (note === 's/s' || note === 'standby siang') return 'bg-fuchsia-500 text-white font-semibold';
  if (note === 's/m' || note === 'standby malam') return 'bg-pink-500 text-white font-semibold';
  
  // Partial matches
  if (note.includes('pagi')) return 'bg-blue-500 text-white font-semibold';
  if (note.includes('siang')) return 'bg-orange-500 text-white font-semibold';
  if (note.includes('malam')) return 'bg-emerald-600 text-white font-semibold';
  if (note.includes('cuti tahunan')) return 'bg-amber-400 text-gray-900 font-semibold';
  if (note.includes('cuti sakit') || note.includes('cuti dokter')) return 'bg-rose-500 text-white font-semibold';
  if (note.includes('office hour')) return 'bg-cyan-500 text-white font-semibold';
  if (note.includes('standby')) return 'bg-purple-500 text-white font-semibold';
  if (note.includes('dinas luar')) return 'bg-teal-500 text-white font-semibold';
  if (note.includes('lepas')) return 'bg-gray-600 text-white font-semibold';
  if (note.includes('tugas belajar')) return 'bg-indigo-500 text-white font-semibold';
  if (note.includes('cuti') || note.includes('leave')) return 'bg-yellow-500 text-gray-900 font-semibold';
  if (note.includes('training') || note.includes('pelatihan')) return 'bg-sky-500 text-white font-semibold';
  if (note.includes('sakit') || note.includes('sick')) return 'bg-red-500 text-white font-semibold';
  
  return 'bg-lime-500 text-gray-900 font-semibold';
};

/**
 * Get display text for a shift
 */
export const getShiftDisplayText = (shiftName: string): string => {
  const name = shiftName.toLowerCase();
  if (name.includes('morning') || name.includes('pagi') || name.includes('shift 1') || name === 'pagi') return 'P';
  if (name.includes('afternoon') || name.includes('siang') || name.includes('shift 2') || name === 'siang') return 'S';
  if (name.includes('night') || name.includes('malam') || name.includes('shift 3') || name === 'malam') return 'M';
  if (name.includes('libur') || name.includes('off')) return 'L';
  const cleaned = shiftName.replace(/^(Shift\s+\d+\s*-?\s*|Dinas\s+)/i, '').trim();
  return cleaned.split(' ')[0] || shiftName;
};

/**
 * Clean notes text for display
 */
export const cleanNotesText = (notes: string): string => {
  if (notes.length === 1 && /[PSML]/i.test(notes)) {
    return notes.toUpperCase();
  }
  return notes.replace(/^(Dinas\s+)/i, '').trim();
};

/**
 * Get number of days in a month
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

/**
 * Get short day name
 */
export const getDayName = (year: number, month: number, day: number): string => {
  const date = new Date(year, month - 1, day);
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  return dayNames[date.getDay()];
};

/**
 * Split days into weeks
 */
export const splitDaysIntoWeeks = (daysInMonth: number): number[][] => {
  const weeks: number[][] = [];
  let currentWeekDays: number[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeekDays.push(day);
    if (currentWeekDays.length === 7 || day === daysInMonth) {
      weeks.push([...currentWeekDays]);
      currentWeekDays = [];
    }
  }
  
  return weeks;
};

/**
 * Get initial week index - prefer week containing today if in roster month
 */
export const getInitialWeekIndex = (weeks: number[][], rosterYear: number, rosterMonth: number): number => {
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth() + 1;
  const todayYear = today.getFullYear();

  if (todayYear === rosterYear && todayMonth === rosterMonth) {
    for (let i = 0; i < weeks.length; i++) {
      if (weeks[i].includes(todayDay)) {
        return i;
      }
    }
  }
  return 0;
};
