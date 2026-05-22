/**
 * RosteredStaffPersonView Component
 * 
 * Shows roster in a person-by-person format
 * Each row represents one employee with all their shift assignments for the month
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import type { RosterPeriod, Shift, Employee, ShiftAssignment, ManagerDuty } from '../types/roster';
import { useAuth } from '../../auth/core/AuthContext';
import { rosterService } from '../repository/rosterService';
import { useDataCache } from '../../../contexts/DataCacheContext';
import RosteredStaffHeader from './rosteredStaff/RosteredStaffHeader';
import RosteredStaffPrintStyles from './rosteredStaff/RosteredStaffPrintStyles';
import SectionTableDividerRows from './rosteredStaff/SectionTableDividerRows';
import { getManagerTeknikEffectiveGroup } from './rosteredStaff/managerGroupLogic';

interface RosteredStaffPersonViewProps {
  roster: RosterPeriod;
  shifts: Shift[];
}

type EmployeeRosterRow = {
  employee: Employee;
  assignmentsByDay: Map<number, ShiftAssignment>; // day number -> assignment
};

type ReassignDestination =
  | { kind: 'manager' }
  | { kind: 'group'; groupNumber: number };

type PendingRemovalReassign = {
  employeeId: number;
  employeeName: string;
  employeeType: 'CNS' | 'Support';
  sourceType: 'Manager Teknik' | 'CNS' | 'Support';
  employeeGrade: number;
  currentGroup: number;
  availableDestinations: ReassignDestination[];
};

const waitForNextPaint = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

const RosteredStaffPersonView: React.FC<RosteredStaffPersonViewProps> = ({
  roster,
  shifts
}) => {
  const { user } = useAuth();
  const { updateRosterDetail, getRosterDetail } = useDataCache();
  const [editingCell, setEditingCell] = useState<{ employeeId: number; day: number } | null>(null);
  const [customText, setCustomText] = useState('');
  const [selectedCells, setSelectedCells] = useState<Array<{ employeeId: number; day: number }>>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ employeeId: number; day: number } | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
  const [autoFillPattern, setAutoFillPattern] = useState(false);
  const [applyToGroup, setApplyToGroup] = useState(false);
  const [showFullMonth, setShowFullMonth] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth < 640 : false)
  );
  const [optimisticAssignments, setOptimisticAssignments] = useState<Record<string, ShiftAssignment>>({});
  const [addingManagerToGroup, setAddingManagerToGroup] = useState<{ type: string; groupNum: number } | null>(null);
  const [addGroupSearch, setAddGroupSearch] = useState('');
  const [pendingRemovalReassign, setPendingRemovalReassign] = useState<PendingRemovalReassign | null>(null);
  const [managerGroupSelectorOpen, setManagerGroupSelectorOpen] = useState<number | null>(null);
  const [selectedShortageDay, setSelectedShortageDay] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Check if user can edit (Manager Teknik only)
  const canEdit = user?.role === 'Manager Teknik';
  const isRosterPublished = (roster.status || '').toLowerCase() === 'published';
  const canEditRoster = canEdit && !isRosterPublished;

  // Ensure all edit UI state is cleared in read-only mode (published roster)
  useEffect(() => {
    if (!canEditRoster) {
      setEditingCell(null);
      setSelectedCells([]);
      setIsSelecting(false);
      setSelectionStart(null);
      setManagerGroupSelectorOpen(null);
      setAddingManagerToGroup(null);
      setPendingRemovalReassign(null);
    }
  }, [canEditRoster]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update toolbar position when selection changes
  useEffect(() => {
    if (selectedCells.length === 0 || isSelecting) {
      setToolbarPosition(null);
      return;
    }

    // Get the first selected cell to position toolbar below it
    const firstCell = selectedCells[0];
    const cellKey = `${firstCell.employeeId}-${firstCell.day}`;
    const cellElement = cellRefs.current.get(cellKey);

    if (cellElement) {
      const cellRect = cellElement.getBoundingClientRect();
      
      const toolbarWidth = 320; // min-w-[320px]
      const toolbarHeight = 250; // estimated height
      const gap = 50; // Increased gap for positioning below the cell
      
      // Calculate position below the cell (using viewport coordinates for fixed positioning)
      let top = cellRect.bottom + gap;
      let left = cellRect.left;
      
      // Adjust if toolbar would overflow right edge of viewport
      const viewportWidth = window.innerWidth;
      if (left + toolbarWidth > viewportWidth) {
        left = viewportWidth - toolbarWidth - 20;
      }
      
      // Ensure left is not negative
      if (left < 20) {
        left = 20;
      }
      
      // Check if toolbar would overflow bottom of viewport - if so, position above the cell
      const viewportHeight = window.innerHeight;
      if (top + toolbarHeight > viewportHeight) {
        // Position above the cell instead
        top = cellRect.top - toolbarHeight - gap;
        // If still negative, position at the top with a small gap
        if (top < 20) {
          top = 20;
        }
      }
      
      setToolbarPosition({ top, left });
    }
  }, [selectedCells, isSelecting]);

  // Close dropdown on Escape key or click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingCell(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (editingCell && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setEditingCell(null);
      }
    };

    if (editingCell) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      setCustomText(''); // Reset custom text when opening
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [editingCell]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setManagerGroupSelectorOpen(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-group-selector]')) {
        setManagerGroupSelectorOpen(null);
      }
    };

    if (managerGroupSelectorOpen !== null) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [managerGroupSelectorOpen]);

  // Shift options for dropdown
  const getShiftOptions = () => {
    const pagiShift = shifts.find(s => s.name.toLowerCase().includes('pagi'));
    const siangShift = shifts.find(s => s.name.toLowerCase().includes('siang'));
    const malamShift = shifts.find(s => s.name.toLowerCase().includes('malam'));
    const liburShift = shifts.find(s => s.name.toLowerCase().includes('libur'));

    const options = [];
    
    // Add Pagi option - only if found
    if (pagiShift) {
      options.push({ 
        label: 'P - Pagi', 
        value: 'pagi', 
        shiftId: pagiShift.id,
        notes: 'P',
      });
    }
    
    // Add Siang option - only if found
    if (siangShift) {
      options.push({ 
        label: 'S - Siang', 
        value: 'siang', 
        shiftId: siangShift.id,
        notes: 'S',
      });
    }
    
    // Add Malam option - only if found
    if (malamShift) {
      options.push({ 
        label: 'M - Malam', 
        value: 'malam', 
        shiftId: malamShift.id,
        notes: 'M',
      });
    }
    
    // Add Libur options (use libur shift if available, otherwise first shift as fallback)
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

  const shiftOptions = getShiftOptions();
  const specialStatusOptions = [
    { label: 'Cuti Kepentingan', note: 'Cuti Kepentingan' },
    { label: 'Cuti Sakit', note: 'Cuti Sakit' },
    { label: 'TPO Malang', note: 'TPO Malang' },
    { label: 'TPO Dhoho', note: 'TPO Dhoho' },
    { label: 'TPO Sumenep', note: 'TPO Sumenep' },
  ];

  const getCellKey = (employeeId: number, day: number) => `${employeeId}-${day}`;

  const setOptimisticAssignmentsFromRoster = (nextRoster: RosterPeriod, cells: Array<{ employeeId: number; day: number }>) => {
    setOptimisticAssignments((prev) => {
      const next = { ...prev };

      cells.forEach((cell) => {
        const workDate = `${nextRoster.year}-${String(nextRoster.month).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
        const rosterDay = nextRoster.roster_days?.find((day) => day.work_date === workDate);
        const assignment = rosterDay?.shift_assignments?.find((item) => item.employee_id === cell.employeeId);
        const key = getCellKey(cell.employeeId, cell.day);

        if (assignment) {
          next[key] = assignment;
        } else {
          delete next[key];
        }
      });

      return next;
    });
  };

  const clearOptimisticAssignments = (cells: Array<{ employeeId: number; day: number }>) => {
    setOptimisticAssignments((prev) => {
      const next = { ...prev };
      cells.forEach((cell) => {
        delete next[getCellKey(cell.employeeId, cell.day)];
      });
      return next;
    });
  };

  // Check if a cell is selected
  const isCellSelected = (employeeId: number, day: number): boolean => {
    return selectedCells.some(cell => cell.employeeId === employeeId && cell.day === day);
  };

  // Handle mousedown to start selection
  const handleCellMouseDown = (employeeId: number, day: number, colSpan: number, clickX: number, cellElement: HTMLElement, e: React.MouseEvent) => {
    if (!canEditRoster) return;
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate which specific day was clicked within merged cell
    let targetDay = day;
    if (colSpan > 1) {
      const rect = cellElement.getBoundingClientRect();
      const relativeX = clickX - rect.left;
      const cellWidth = rect.width / colSpan;
      const dayOffset = Math.floor(relativeX / cellWidth);
      targetDay = day + dayOffset;
    }
    
    setSelectionStart({ employeeId, day: targetDay });
    setIsSelecting(true);
    
    // Single click - replace selection with just this cell
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedCells([{ employeeId, day: targetDay }]);
    } else {
      // Ctrl/Cmd click - toggle this cell
      toggleCellSelection(employeeId, targetDay);
    }
  };

  // Handle mousemove for drag selection (2D rectangle selection)
  const handleCellMouseEnter = (employeeId: number, day: number, colSpan: number) => {
    if (!isSelecting || !selectionStart) return;
    
    // Expand selection from start to current cell (including all days in range)
    const allDays: number[] = [];
    for (let d = day; d < day + colSpan; d++) {
      allDays.push(d);
    }
    
    const newSelection: Array<{ employeeId: number; day: number }> = [];
    
    // Get min/max days
    const minDay = Math.min(selectionStart.day, ...allDays);
    const maxDay = Math.max(selectionStart.day, ...allDays);
    
    // 2D Selection: Get min/max employee IDs for vertical selection
    // Use display-ordered employees to match the UI rendering order
    const displayOrderedEmployees = getDisplayOrderedEmployees();
    const startEmployeeIndex = displayOrderedEmployees.findIndex(r => r.employee.id === selectionStart.employeeId);
    const currentEmployeeIndex = displayOrderedEmployees.findIndex(r => r.employee.id === employeeId);
    
    if (startEmployeeIndex === -1 || currentEmployeeIndex === -1) return;
    
    const minEmployeeIndex = Math.min(startEmployeeIndex, currentEmployeeIndex);
    const maxEmployeeIndex = Math.max(startEmployeeIndex, currentEmployeeIndex);
    
    // Select rectangle: all employees from minIndex to maxIndex, all days from minDay to maxDay
    for (let empIdx = minEmployeeIndex; empIdx <= maxEmployeeIndex; empIdx++) {
      const empId = displayOrderedEmployees[empIdx].employee.id;
      for (let d = minDay; d <= maxDay; d++) {
        newSelection.push({ employeeId: empId, day: d });
      }
    }
    
    setSelectedCells(newSelection);
  };

  // Handle mouseup to end selection
  const handleMouseUp = () => {
    setIsSelecting(false);
    setSelectionStart(null);
  };

  // Toggle selection of a single cell
  const toggleCellSelection = (employeeId: number, day: number) => {
    setSelectedCells(prev => {
      const isSelected = prev.some(cell => cell.employeeId === employeeId && cell.day === day);
      if (isSelected) {
        return prev.filter(cell => !(cell.employeeId === employeeId && cell.day === day));
      } else {
        return [...prev, { employeeId, day }];
      }
    });
  };

  // Handle click to open dropdown (separate from selection)
  const handleCellDoubleClick = (employeeId: number, day: number, e: React.MouseEvent) => {
    if (!canEditRoster) return;
    e.stopPropagation();
    setEditingCell({ employeeId, day });
  };

  // Generate pattern cells for auto-fill
  const generatePatternCells = (startCell: { employeeId: number; day: number }, startPatternIndex: number) => {
    // Pattern cycle: S (0) -> P (1) -> M (2) -> L (3) -> L (4)
    const patternCycle = ['siang', 'pagi', 'malam', 'libur1', 'libur2'];
    const daysInMonth = new Date(roster.year, roster.month, 0).getDate();
    const patternCells: Array<{ employeeId: number; day: number; patternValue: string }> = [];
    
    let patternIndex = startPatternIndex;
    for (let day = startCell.day; day <= daysInMonth; day++) {
      patternCells.push({
        employeeId: startCell.employeeId,
        day: day,
        patternValue: patternCycle[patternIndex % 5]
      });
      patternIndex++;
    }
    
    return patternCells;
  };

  // Handle pattern fill with auto-cycling shifts
  const handlePatternFill = async (optionValue: string) => {
    if (selectedCells.length !== 1) return;

    const startCell = selectedCells[0];
    const patternMap: Record<string, number> = {
      'siang': 0,
      'pagi': 1,
      'malam': 2,
      'libur1': 3,
      'libur2': 4
    };
    const startIndex = patternMap[optionValue] ?? 0;
    
    // Generate pattern cells
    const patternCells = generatePatternCells(startCell, startIndex);
    
    // Get all unique employees for proper employee data
    const allEmployees = getAllUniqueEmployees();
    const employeeData = allEmployees.get(startCell.employeeId);
    if (!employeeData) return;

    const baseRoster = getRosterDetail(roster.id) || roster;

    // Update optimistically - group by date
    const cellsByDate: Record<string, Array<{ day: number; patternValue: string }>> = {};
    patternCells.forEach(pc => {
      const dateStr = `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(pc.day).padStart(2, '0')}`;
      if (!cellsByDate[dateStr]) {
        cellsByDate[dateStr] = [];
      }
      cellsByDate[dateStr].push({ day: pc.day, patternValue: pc.patternValue });
    });

    let updatedRoster = { ...baseRoster };

    // Update each date with corresponding pattern shift
    for (const [dateStr, cells] of Object.entries(cellsByDate)) {
      const rosterDay = updatedRoster.roster_days?.find(d => d.work_date === dateStr);
      if (!rosterDay) continue;

      const cell = cells[0]; // Should only be one cell per date for single employee
      const option = shiftOptions.find(o => o.value === cell.patternValue);
      if (!option || !option.shiftId) continue;

      const selectedShift = shifts.find(s => s.id === option.shiftId);
      if (!selectedShift) continue;

      const finalNotes = option.notes || 'P';

      // Keep assignments for other employees
      const otherEmployeeAssignments = rosterDay.shift_assignments?.filter(
        a => a.employee_id !== startCell.employeeId
      ) || [];

      // Create new assignment for this employee
      const existingAssignment = rosterDay.shift_assignments?.find(a => a.employee_id === startCell.employeeId);
      const newAssignment = {
        id: existingAssignment?.id || Date.now() + Math.random(),
        roster_day_id: rosterDay.id,
        employee_id: startCell.employeeId,
        shift_id: selectedShift.id,
        notes: finalNotes,
        span_days: 1,
        created_at: new Date().toISOString(),
        employee: employeeData,
        shift: selectedShift,
      };

      const allAssignments = [...otherEmployeeAssignments, newAssignment];

      updatedRoster = {
        ...updatedRoster,
        roster_days: updatedRoster.roster_days?.map(d => 
          d.id === rosterDay.id ? { ...d, shift_assignments: allAssignments } : d
        )
      };
    }

    const affectedCells = patternCells.map((pc) => ({ employeeId: startCell.employeeId, day: pc.day }));
    setOptimisticAssignmentsFromRoster(updatedRoster, affectedCells);
    updateRosterDetail(roster.id, updatedRoster as RosterPeriod);

    // Clear selection
    setSelectedCells([]);
    setEditingCell(null);

    // Send updates to backend using batch update
    try {
      await waitForNextPaint();
      // Group pattern cells by shift to minimize API calls
      const cellsByShift = patternCells.reduce((acc, pc) => {
        if (!acc[pc.patternValue]) {
          acc[pc.patternValue] = [];
        }
        acc[pc.patternValue].push(pc);
        return acc;
      }, {} as Record<string, typeof patternCells>);

      // Create assignments array for batch update
      const assignments = Object.entries(cellsByShift).map(([shiftValue, cells]) => {
        const option = shiftOptions.find(o => o.value === shiftValue);
        if (!option) return null;

        const workDates = cells.map(pc => 
          `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(pc.day).padStart(2, '0')}`
        );

        return {
          employee_id: startCell.employeeId,
          work_dates: workDates,
          shift: option.shiftId!.toString(),
          notes: option.notes || 'P',
        };
      }).filter((a): a is NonNullable<typeof a> => a !== null);

      // Single batch API call
      const response = await rosterService.batchUpdateAssignments(roster.id, assignments);

      // Get fresh roster and update with real data
      const currentRoster = getRosterDetail(roster.id);
      if (!currentRoster) return;

      let finalRoster = { ...currentRoster };

      if (response.data.updated_days && response.data.updated_days.length > 0) {
        for (const updatedDay of response.data.updated_days) {
          const realAssignment = updatedDay.assignment;
          const rosterDay = finalRoster.roster_days?.find(d => d.id === updatedDay.roster_day_id);
          
          if (rosterDay) {
            const otherAssignments = rosterDay.shift_assignments?.filter(
              a => a.employee_id !== realAssignment.employee_id
            ) || [];

            const finalAssignments = [...otherAssignments, realAssignment];

            finalRoster = {
              ...finalRoster,
              roster_days: finalRoster.roster_days?.map(d => 
                d.id === rosterDay.id ? { ...d, shift_assignments: finalAssignments } : d
              )
            };
          }
        }
      }

      updateRosterDetail(roster.id, finalRoster);
    } catch (error) {
      console.error('Failed to update pattern:', error);
      toast.error('Gagal menyimpan perubahan roster');
    } finally {
      clearOptimisticAssignments(affectedCells);
    }
  };

  // Get all employees in the same group as the selected employee
  const getEmployeesInSameGroup = (employeeId: number): number[] => {
    const allEmployees = getAllUniqueEmployees();
    const selectedEmployee = allEmployees.get(employeeId);
    
    if (!selectedEmployee) {
      return [employeeId]; // If no group, return only this employee
    }

    const selectedGroup = selectedEmployee.employee_type === 'Manager Teknik'
      ? getManagerTeknikEffectiveGroup(selectedEmployee)
      : (selectedEmployee.group_number ?? 0);

    if (!selectedGroup) {
      return [employeeId];
    }

    const sameGroupEmployees: number[] = [];
    allEmployees.forEach((employee, id) => {
      const employeeGroup = employee.employee_type === 'Manager Teknik'
        ? getManagerTeknikEffectiveGroup(employee)
        : (employee.group_number ?? 0);

      if (selectedEmployee.employee_type === 'Manager Teknik') {
        // Manager format mode should affect manager + CNS + Support in the led group.
        if (
          employeeGroup === selectedGroup &&
          (employee.employee_type === 'Manager Teknik' || employee.employee_type === 'CNS' || employee.employee_type === 'Support')
        ) {
          sameGroupEmployees.push(id);
        }
        return;
      }

      if (employee.employee_type === selectedEmployee.employee_type && employeeGroup === selectedGroup) {
        sameGroupEmployees.push(id);
      }
    });

    return sameGroupEmployees;
  };

  // Handle group fill (all employees in group for selected date with same shift)
  const handleGroupFill = async (optionValue: string, customNote?: string) => {
    if (selectedCells.length !== 1) return;

    const startCell = selectedCells[0];
    const groupEmployeeIds = getEmployeesInSameGroup(startCell.employeeId);

    const option = shiftOptions.find(o => o.value === optionValue);
    if (!option || !option.shiftId) return;

    const selectedShift = shifts.find(s => s.id === option.shiftId);
    if (!selectedShift) return;

    const finalNotes = customNote || option.notes || 'P';

    // Create cells for all employees in group for the same date
    const cellsToUpdate = groupEmployeeIds.map(empId => ({
      employeeId: empId,
      day: startCell.day
    }));

    // Show what will be updated
    setSelectedCells(cellsToUpdate);

    // Update optimistically
    const allEmployees = getAllUniqueEmployees();
    const dateStr = `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(startCell.day).padStart(2, '0')}`;
    
    const baseRoster = getRosterDetail(roster.id) || roster;
    let updatedRoster = { ...baseRoster };
    const rosterDay = updatedRoster.roster_days?.find(d => d.work_date === dateStr);
    
    if (rosterDay) {
      // Keep assignments for employees outside the group
      const otherEmployeeAssignments = rosterDay.shift_assignments?.filter(
        a => !groupEmployeeIds.includes(a.employee_id)
      ) || [];

      // Create new assignments for all employees in group
      const newAssignments = groupEmployeeIds.map(empId => {
        const existingAssignment = rosterDay.shift_assignments?.find(a => a.employee_id === empId);
        const employeeData = allEmployees.get(empId);
        
        if (!employeeData) return null;

        return {
          id: existingAssignment?.id || Date.now() + Math.random(),
          roster_day_id: rosterDay.id,
          employee_id: empId,
          shift_id: selectedShift.id,
          notes: finalNotes,
          span_days: 1,
          created_at: new Date().toISOString(),
          employee: employeeData,
          shift: selectedShift,
        };
      }).filter((a): a is NonNullable<typeof a> => a !== null);

      const allAssignments = [...otherEmployeeAssignments, ...newAssignments];

      updatedRoster = {
        ...updatedRoster,
        roster_days: updatedRoster.roster_days?.map(d => 
          d.id === rosterDay.id ? { ...d, shift_assignments: allAssignments } : d
        )
      };
    }

    setOptimisticAssignmentsFromRoster(updatedRoster, cellsToUpdate);
    updateRosterDetail(roster.id, updatedRoster as RosterPeriod);

    // Clear selection
    setSelectedCells([]);
    setEditingCell(null);

    // Send batch update to backend
    try {
      await waitForNextPaint();
      const assignments = groupEmployeeIds.map(empId => ({
        employee_id: empId,
        work_dates: [dateStr],
        shift: selectedShift.id.toString(),
        notes: finalNotes,
      }));

      const response = await rosterService.batchUpdateAssignments(roster.id, assignments);

      // Update with real data from backend
      const currentRoster = getRosterDetail(roster.id);
      if (!currentRoster) return;

      let finalRoster = { ...currentRoster };

      if (response.data.updated_days && response.data.updated_days.length > 0) {
        for (const updatedDay of response.data.updated_days) {
          const realAssignment = updatedDay.assignment;
          const rosterDay = finalRoster.roster_days?.find(d => d.id === updatedDay.roster_day_id);
          
          if (rosterDay) {
            const otherAssignments = rosterDay.shift_assignments?.filter(
              a => a.employee_id !== realAssignment.employee_id
            ) || [];

            const finalAssignments = [...otherAssignments, realAssignment];

            finalRoster = {
              ...finalRoster,
              roster_days: finalRoster.roster_days?.map(d => 
                d.id === rosterDay.id ? { ...d, shift_assignments: finalAssignments } : d
              )
            };
          }
        }
      }

      updateRosterDetail(roster.id, finalRoster);
    } catch (error) {
      console.error('Failed to update group:', error);
      toast.error('Gagal menyimpan perubahan roster');
    } finally {
      clearOptimisticAssignments(cellsToUpdate);
    }
  };

  // Handle group pattern fill (all employees in group with pattern from start date)
  const handleGroupPatternFill = async (optionValue: string) => {
    if (selectedCells.length !== 1) return;

    const startCell = selectedCells[0];
    const groupEmployeeIds = getEmployeesInSameGroup(startCell.employeeId);

    const patternMap: Record<string, number> = {
      'siang': 0,
      'pagi': 1,
      'malam': 2,
      'libur1': 3,
      'libur2': 4
    };
    const startIndex = patternMap[optionValue] ?? 0;

    // Generate pattern for one employee first
    const patternCells = generatePatternCells(startCell, startIndex);

    // Replicate pattern for all employees in group
    const allPatternCells: Array<{ employeeId: number; day: number; patternValue: string }> = [];
    groupEmployeeIds.forEach(empId => {
      patternCells.forEach(pc => {
        allPatternCells.push({
          employeeId: empId,
          day: pc.day,
          patternValue: pc.patternValue
        });
      });
    });

    // Update optimistically
    const allEmployees = getAllUniqueEmployees();
    const cellsByDate: Record<string, Array<{ employeeId: number; patternValue: string }>> = {};
    
    allPatternCells.forEach(pc => {
      const dateStr = `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(pc.day).padStart(2, '0')}`;
      if (!cellsByDate[dateStr]) {
        cellsByDate[dateStr] = [];
      }
      cellsByDate[dateStr].push({ employeeId: pc.employeeId, patternValue: pc.patternValue });
    });

    const baseRoster = getRosterDetail(roster.id) || roster;
    let updatedRoster = { ...baseRoster };

    for (const [dateStr, cells] of Object.entries(cellsByDate)) {
      const rosterDay = updatedRoster.roster_days?.find(d => d.work_date === dateStr);
      if (!rosterDay) continue;

      // Keep assignments for employees outside the group
      const otherEmployeeAssignments = rosterDay.shift_assignments?.filter(
        a => !groupEmployeeIds.includes(a.employee_id)
      ) || [];

      // Create new assignments for all employees in group for this date
      const newAssignments = cells.map(cell => {
        const option = shiftOptions.find(o => o.value === cell.patternValue);
        if (!option || !option.shiftId) return null;

        const selectedShift = shifts.find(s => s.id === option.shiftId);
        if (!selectedShift) return null;

        const employeeData = allEmployees.get(cell.employeeId);
        if (!employeeData) return null;

        const existingAssignment = rosterDay.shift_assignments?.find(a => a.employee_id === cell.employeeId);

        return {
          id: existingAssignment?.id || Date.now() + Math.random(),
          roster_day_id: rosterDay.id,
          employee_id: cell.employeeId,
          shift_id: selectedShift.id,
          notes: option.notes || 'P',
          span_days: 1,
          created_at: new Date().toISOString(),
          employee: employeeData,
          shift: selectedShift,
        };
      }).filter((a): a is NonNullable<typeof a> => a !== null);

      const allAssignments = [...otherEmployeeAssignments, ...newAssignments];

      updatedRoster = {
        ...updatedRoster,
        roster_days: updatedRoster.roster_days?.map(d => 
          d.id === rosterDay.id ? { ...d, shift_assignments: allAssignments } : d
        )
      };
    }

    const affectedCells = allPatternCells.map((cell) => ({ employeeId: cell.employeeId, day: cell.day }));
    setOptimisticAssignmentsFromRoster(updatedRoster, affectedCells);
    updateRosterDetail(roster.id, updatedRoster as RosterPeriod);

    // Clear selection
    setSelectedCells([]);
    setEditingCell(null);

    // Send batch update to backend
    try {
      await waitForNextPaint();
      // Group by shift pattern for efficiency
      const assignmentsByShift: Record<string, Array<{ employeeId: number; dates: Set<string> }>> = {};

      allPatternCells.forEach(pc => {
        if (!assignmentsByShift[pc.patternValue]) {
          assignmentsByShift[pc.patternValue] = [];
        }

        let employeeEntry = assignmentsByShift[pc.patternValue].find(e => e.employeeId === pc.employeeId);
        if (!employeeEntry) {
          employeeEntry = { employeeId: pc.employeeId, dates: new Set() };
          assignmentsByShift[pc.patternValue].push(employeeEntry);
        }

        const dateStr = `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(pc.day).padStart(2, '0')}`;
        employeeEntry.dates.add(dateStr);
      });

      // Create assignments array for batch update
      const assignments: Array<{ employee_id: number; work_dates: string[]; shift: string; notes: string }> = [];

      Object.entries(assignmentsByShift).forEach(([patternValue, entries]) => {
        const option = shiftOptions.find(o => o.value === patternValue);
        if (!option) return;

        entries.forEach(entry => {
          assignments.push({
            employee_id: entry.employeeId,
            work_dates: Array.from(entry.dates),
            shift: option.shiftId!.toString(),
            notes: option.notes || 'P',
          });
        });
      });

      const response = await rosterService.batchUpdateAssignments(roster.id, assignments);

      // Update with real data from backend
      const currentRoster = getRosterDetail(roster.id);
      if (!currentRoster) return;

      let finalRoster = { ...currentRoster };

      if (response.data.updated_days && response.data.updated_days.length > 0) {
        for (const updatedDay of response.data.updated_days) {
          const realAssignment = updatedDay.assignment;
          const rosterDay = finalRoster.roster_days?.find(d => d.id === updatedDay.roster_day_id);
          
          if (rosterDay) {
            const otherAssignments = rosterDay.shift_assignments?.filter(
              a => a.employee_id !== realAssignment.employee_id
            ) || [];

            const finalAssignments = [...otherAssignments, realAssignment];

            finalRoster = {
              ...finalRoster,
              roster_days: finalRoster.roster_days?.map(d => 
                d.id === rosterDay.id ? { ...d, shift_assignments: finalAssignments } : d
              )
            };
          }
        }
      }

      updateRosterDetail(roster.id, finalRoster);
    } catch (error) {
      console.error('Failed to update group pattern:', error);
      toast.error('Gagal menyimpan perubahan roster');
    } finally {
      clearOptimisticAssignments(affectedCells);
    }
  };

  // Apply shift change to all selected cells
  const handleMultiShiftChange = async (optionValue: string, customNote?: string) => {
    if (!canEditRoster) return;
    if (selectedCells.length === 0) return;

    // Case 1: Auto-fill pattern enabled and only one cell selected
    if (autoFillPattern && selectedCells.length === 1 && !applyToGroup) {
      await handlePatternFill(optionValue);
      return;
    }

    // Case 2: Apply to group + pattern (all employees in group with pattern from start date)
    if (applyToGroup && autoFillPattern && selectedCells.length === 1) {
      await handleGroupPatternFill(optionValue);
      return;
    }

    // Case 3: Apply to group only (all employees in group for selected dates)
    if (applyToGroup && selectedCells.length === 1) {
      await handleGroupFill(optionValue, customNote);
      return;
    }

    // Case 4: Normal multi-cell update (same shift for all)
    const option = shiftOptions.find(o => o.value === optionValue);
    if (!option || !option.shiftId) return;

    const selectedShift = shifts.find(s => s.id === option.shiftId);
    if (!selectedShift) return;

    const finalNotes = customNote || option.notes || 'P';

    // Group cells by employee for batch updates
    const cellsByEmployee = selectedCells.reduce((acc, cell) => {
      if (!acc[cell.employeeId]) {
        acc[cell.employeeId] = [];
      }
      acc[cell.employeeId].push(cell.day);
      return acc;
    }, {} as Record<number, number[]>);

    // Update all selected cells optimistically first
    // Get all unique employees first to ensure we have proper employee data
    const allEmployees = getAllUniqueEmployees();
    
    // Group selected cells by date for efficient batch update
    const cellsByDate = selectedCells.reduce((acc, cell) => {
      const dateStr = `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(cell);
      return acc;
    }, {} as Record<string, Array<{ employeeId: number; day: number }>>);
    
    const baseRoster = getRosterDetail(roster.id) || roster;
    let updatedRoster = { ...baseRoster };
    
    // Process all updates per date to avoid stale references
    for (const [dateStr, cells] of Object.entries(cellsByDate)) {
      const rosterDay = updatedRoster.roster_days?.find(d => d.work_date === dateStr);
      if (!rosterDay) continue;

      // Keep existing assignments for other employees
      const otherEmployeeAssignments = rosterDay.shift_assignments?.filter(
        a => !cells.some(cell => cell.employeeId === a.employee_id)
      ) || [];

      // Create new assignments for selected employees
      const newAssignments = cells.map(cell => {
        const existingAssignment = rosterDay.shift_assignments?.find(a => a.employee_id === cell.employeeId);
        const employeeData = allEmployees.get(cell.employeeId);
        
        if (!employeeData) {
          console.error(`Employee data not found for ID: ${cell.employeeId}`);
          return null;
        }

        return {
          id: existingAssignment?.id || Date.now() + Math.random(), // Temporary ID
          roster_day_id: rosterDay.id,
          employee_id: cell.employeeId,
          shift_id: selectedShift.id,
          notes: finalNotes,
          span_days: 1,
          created_at: new Date().toISOString(),
          employee: employeeData,
          shift: selectedShift,
        };
      }).filter((a): a is NonNullable<typeof a> => a !== null);

      // Combine all assignments for this date
      const allAssignments = [...otherEmployeeAssignments, ...newAssignments];

      // Update roster with new assignments for this date
      updatedRoster = {
        ...updatedRoster,
        roster_days: updatedRoster.roster_days?.map(d => 
          d.id === rosterDay.id ? { ...d, shift_assignments: allAssignments } : d
        )
      };
    }

    const affectedCells = [...selectedCells];
    setOptimisticAssignmentsFromRoster(updatedRoster, affectedCells);
    updateRosterDetail(roster.id, updatedRoster as RosterPeriod);

    // Clear selection and close editor
    setSelectedCells([]);
    setEditingCell(null);

    // Send batch update to API - ONE call for all employees and dates
    try {
      await waitForNextPaint();
      const assignments = Object.entries(cellsByEmployee).map(([employeeIdStr, days]) => {
        const employeeId = parseInt(employeeIdStr);
        const workDates = days.map(day => 
          `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        );

        return {
          employee_id: employeeId,
          work_dates: workDates,
          shift: selectedShift.id.toString(),
          notes: finalNotes,
        };
      });

      // Single batch API call instead of multiple calls
      const response = await rosterService.batchUpdateAssignments(roster.id, assignments);

      // Get the latest roster from cache
      const currentRoster = getRosterDetail(roster.id);
      if (!currentRoster) return;

      let finalRoster = { ...currentRoster };

      // Process batch response
      if (response.data.updated_days && response.data.updated_days.length > 0) {
        for (const updatedDay of response.data.updated_days) {
          const realAssignment = updatedDay.assignment;
          const rosterDay = finalRoster.roster_days?.find(d => d.id === updatedDay.roster_day_id);
          
          if (rosterDay) {
            // Remove old assignment for this employee on this day
            const otherAssignments = rosterDay.shift_assignments?.filter(
              a => a.employee_id !== realAssignment.employee_id
            ) || [];

            // Add new assignment
            const finalAssignments = [...otherAssignments, realAssignment];

            finalRoster = {
              ...finalRoster,
              roster_days: finalRoster.roster_days?.map(d => 
                d.id === rosterDay.id ? { ...d, shift_assignments: finalAssignments } : d
              )
            };
          }
        }
      }

      // Update cache with all real data from backend
      updateRosterDetail(roster.id, finalRoster);
    } catch (error) {
      console.error('Failed to update assignments:', error);
      toast.error('Gagal menyimpan perubahan roster');
    } finally {
      clearOptimisticAssignments(affectedCells);
    }
  };

  // Add global mouseup listener
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!addingManagerToGroup) {
      setAddGroupSearch('');
    }
  }, [addingManagerToGroup]);

  const handleShiftChange = async (employeeId: number, day: number, optionValue: string, customNote?: string) => {
    if (!canEditRoster) return;
    const baseRoster = getRosterDetail(roster.id) || roster;
    const option = shiftOptions.find(o => o.value === optionValue);
    if (!option || !option.shiftId) {
      console.error('Option not found or missing shiftId:', optionValue, option);
      return;
    }

    // Find the roster day
    const dateStr = `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const rosterDay = baseRoster.roster_days?.find(d => d.work_date === dateStr);
    
    if (!rosterDay) {
      console.error('Roster day not found');
      return;
    }

    // Find existing assignment to get employee data
    const existingAssignment = rosterDay.shift_assignments?.find(a => a.employee_id === employeeId);

    const allEmployees = getAllUniqueEmployees();
    const employeeData = existingAssignment?.employee || allEmployees.get(employeeId);
    if (!employeeData) {
      console.error('Employee data not found for optimistic update');
      return;
    }
    
    // Get the actual shift from the database using shift_id
    const selectedShift = shifts.find(s => s.id === option.shiftId);
    if (!selectedShift) {
      console.error('Shift not found for ID:', option.shiftId);
      return;
    }
    
    // Priority: customNote > option.notes > default to option.notes value
    // option.notes already set to 'P', 'S', 'M', 'L' in getShiftOptions()
    const finalNotes = customNote || option.notes || 'P';
    
    // Create optimistic assignment for cache
    const optimisticAssignment = {
      id: existingAssignment?.id || Date.now(), // Temporary ID
      roster_day_id: rosterDay.id,
      employee_id: employeeId,
      shift_id: selectedShift.id,
      notes: finalNotes,
      span_days: 1,
      created_at: new Date().toISOString(),
      employee: employeeData,
      shift: selectedShift,
    };

    const affectedCells = [{ employeeId, day }];
    setOptimisticAssignments((prev) => ({
      ...prev,
      [getCellKey(employeeId, day)]: optimisticAssignment as ShiftAssignment,
    }));

    // Also update cached roster immediately so UI changes without waiting API
    const optimisticAssignments = [
      ...(rosterDay.shift_assignments?.filter(a => a.employee_id !== employeeId) || []),
      optimisticAssignment as ShiftAssignment,
    ];

    const optimisticRosterDays = baseRoster.roster_days?.map(d =>
      d.id === rosterDay.id ? { ...d, shift_assignments: optimisticAssignments } : d
    );

    updateRosterDetail(roster.id, {
      ...baseRoster,
      roster_days: optimisticRosterDays,
    } as RosterPeriod);

    // Close dropdown immediately
    setEditingCell(null);
    setCustomText(''); // Reset custom text after saving

    // Send to API in background using new simplified endpoint
    try {
      await waitForNextPaint();
      const response = await rosterService.quickUpdateAssignment(roster.id, {
        employee_id: employeeId,
        work_dates: [dateStr],
        shift_id: selectedShift.id,
        notes: finalNotes,
      });

      // Update cache with real assignment from backend
      if (response.data.updated_days && response.data.updated_days.length > 0) {
        const updatedDay = response.data.updated_days[0];
        const realAssignment = updatedDay.assignment;

        // Update the roster day with the real assignment
        const finalUpdatedAssignments = [
          ...(rosterDay.shift_assignments?.filter(a => a.employee_id !== employeeId) || []),
          realAssignment
        ];

        const finalRosterDay = {
          ...rosterDay,
          shift_assignments: finalUpdatedAssignments
        };

        const currentRoster = getRosterDetail(roster.id) || baseRoster;
        const finalRosterDays = currentRoster.roster_days?.map(d => 
          d.id === rosterDay.id ? finalRosterDay : d
        );

        updateRosterDetail(roster.id, {
          ...currentRoster,
          roster_days: finalRosterDays,
        });
      }
    } catch (error) {
      console.error('Failed to update assignment:', error);
      toast.error('Gagal menyimpan perubahan roster');
    } finally {
      clearOptimisticAssignments(affectedCells);
    }
  };

  const getMonthName = (month: number) => {
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getDayName = (year: number, month: number, day: number): string => {
    const date = new Date(year, month - 1, day);
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return dayNames[date.getDay()];
  };

  const getShiftClasses = (shiftName: string) => {
    const name = shiftName.toLowerCase();
    const spmlClass = 'bg-white text-black border border-black font-semibold';
    if (name.includes('morning') || name.includes('pagi') || name.includes('shift 1')) return spmlClass;
    if (name.includes('afternoon') || name.includes('siang') || name.includes('shift 2')) return spmlClass;
    if (name.includes('night') || name.includes('malam') || name.includes('shift 3')) return spmlClass;
    if (name.includes('libur') || name.includes('off')) return spmlClass;
    return 'bg-yellow-400 text-black font-semibold';
  };

  const getNotesClasses = (notes: string) => {
    const note = notes.toLowerCase().trim();
    const spmlClass = 'bg-white text-black border border-black font-semibold';
    
    // Shift reguler dengan warna kontras tinggi
    if (note === 'pagi' || note === 'p') return spmlClass;
    if (note === 'siang' || note === 's') return spmlClass;
    if (note === 'malam' || note === 'm') return spmlClass;
    
    // Libur tetap merah
    if (note === 'l' || note === 'libur' || note === 'off') return spmlClass;
    if (note === 'l1' || note === 'l2' || note === 'libur1' || note === 'libur2') return spmlClass;
    
    // Partial matches - Gunakan warna yang sama dengan exact match
    if (note.includes('pagi')) return spmlClass;
    if (note.includes('siang')) return spmlClass;
    if (note.includes('malam')) return spmlClass;
    if (note.includes('libur') || note.includes('off')) return spmlClass;
    
    // Semua status selain P/S/M/L -> kuning
    return 'bg-yellow-400 text-black font-semibold';
  };

  const getShiftDisplayText = (shiftName: string): string => {
    const name = shiftName.toLowerCase();
    if (name.includes('morning') || name.includes('pagi') || name.includes('shift 1') || name === 'pagi') return 'P';
    if (name.includes('afternoon') || name.includes('siang') || name.includes('shift 2') || name === 'siang') return 'S';
    if (name.includes('night') || name.includes('malam') || name.includes('shift 3') || name === 'malam') return 'M';
    if (name.includes('libur') || name.includes('off')) return 'L';
    // Remove "Shift X -" or "Dinas" prefix and get the first meaningful word
    const cleaned = shiftName.replace(/^(Shift\s+\d+\s*-?\s*|Dinas\s+)/i, '').trim();
    return cleaned.split(' ')[0] || shiftName;
  };

  const cleanNotesText = (notes: string): string => {
    // If already a single letter code (P/S/M/L), return as is
    if (notes.length === 1 && /[PSML]/i.test(notes)) {
      return notes.toUpperCase();
    }
    // Remove "Dinas" prefix from notes
    return notes.replace(/^(Dinas\s+)/i, '').trim();
  };

  const isLiburValue = (notes?: string | null, shiftName?: string | null): boolean => {
    const note = (notes || '').toLowerCase().trim();
    const shift = (shiftName || '').toLowerCase().trim();

    return note === 'l' || note === 'libur' || note === 'off' || shift.includes('libur') || shift.includes('off');
  };

  const daysInMonth = getDaysInMonth(roster.year, roster.month);
  
  // Split days into weeks (7 days each)
  const weeks: number[][] = [];
  let currentWeekDays: number[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeekDays.push(day);
    if (currentWeekDays.length === 7 || day === daysInMonth) {
      weeks.push([...currentWeekDays]);
      currentWeekDays = [];
    }
  }

  const totalWeeks = weeks.length;

  // Get initial week index - prefer week containing today if in roster month
  const getInitialWeek = () => {
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth() + 1;
    const todayYear = today.getFullYear();

    // Check if today is in the roster month
    if (todayYear === roster.year && todayMonth === roster.month) {
      // Find which week contains today
      for (let i = 0; i < weeks.length; i++) {
        if (weeks[i].includes(todayDay)) {
          return i;
        }
      }
    }
    return 0; // Default to first week
  };

  const [currentWeek, setCurrentWeek] = useState(getInitialWeek());
  const displayedDays = showFullMonth
    ? Array.from({ length: daysInMonth }, (_, index) => index + 1)
    : (weeks[currentWeek] || []);
  const displayedDayNames = displayedDays.map((day) => getDayName(roster.year, roster.month, day));
  const stickyNameWidth = isMobileViewport
    ? 120
    : (showFullMonth ? 150 : 260);
  const stickyGradeWidth = isMobileViewport
    ? 52
    : (showFullMonth ? 64 : 110);
  const stickyRoleWidth = isMobileViewport
    ? 82
    : (showFullMonth ? 110 : 170);
  const shouldStickyMetaColumns = false;
  const stickySectionWidth = stickyNameWidth + stickyGradeWidth + stickyRoleWidth;
  const stickyGradeLeft = stickyNameWidth;
  const stickyRoleLeft = stickyNameWidth + stickyGradeWidth;
  const dayColumnWidth = showFullMonth
    ? (isMobileViewport ? 32 : 40)
    : (isMobileViewport ? 32 : 56);

  const renderGroupDateHeader = (key: string) => (
    <tr key={`group-date-${key}`} className="group-date-header">
      <td
        className="text-left text-[10px] sm:text-xs lg:text-sm font-semibold text-white px-3 sm:px-4 py-2 whitespace-nowrap sticky left-0 z-20"
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
        className={`text-center text-[10px] sm:text-xs lg:text-sm font-semibold text-white px-2 sm:px-3 py-2 whitespace-nowrap ${shouldStickyMetaColumns ? 'sticky z-20' : 'z-0'}`}
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
        className={`text-center text-[10px] sm:text-xs lg:text-sm font-semibold text-white px-2 sm:px-3 py-2 whitespace-nowrap ${shouldStickyMetaColumns ? 'sticky z-20' : 'z-0'}`}
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
          key={`group-day-${key}-${day}-${index}`}
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
              handleShortageDayClick(day);
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
          <div className={`${showFullMonth ? 'text-[8px]' : 'text-[7px] sm:text-[10px]'} text-white/70 leading-none`}>{displayedDayNames[index]}</div>
          <div className="font-bold leading-none mt-0.5">{day}</div>
        </td>
      ))}
      <td className="w-6 sm:w-12" style={{ backgroundColor: '#222E6A' }}></td>
    </tr>
  );

  // Get all unique employees from the entire roster period
  const getAllUniqueEmployees = (): Map<number, Employee> => {
    const employeeMap = new Map<number, Employee>();

    // First, add all employees from roster.all_employees (if available)
    if (roster.all_employees && roster.all_employees.length > 0) {
      roster.all_employees.forEach(employee => {
        employeeMap.set(employee.id, employee);
      });
    }

    // Then, add any employees from assignments (in case some are not in all_employees)
    roster.roster_days?.forEach((day) => {
      day.shift_assignments?.forEach((assignment) => {
        if (!employeeMap.has(assignment.employee_id)) {
          employeeMap.set(assignment.employee_id, assignment.employee);
        }
      });
    });

    return employeeMap;
  };

  // Get all employees and their assignments organized by day
  const getEmployeeRows = (): EmployeeRosterRow[] => {
    const allEmployees = getAllUniqueEmployees();
    const employeeRowsMap = new Map<number, EmployeeRosterRow>();

    // Initialize all employees with empty assignments
    allEmployees.forEach((employee, employeeId) => {
      employeeRowsMap.set(employeeId, {
        employee,
        assignmentsByDay: new Map<number, ShiftAssignment>()
      });
    });

    // Fill in ALL assignments from entire roster period (not just displayed days)
    roster.roster_days?.forEach((day) => {
      const dayNumber = new Date(day.work_date).getDate();
      
      day.shift_assignments?.forEach((assignment) => {
        const existing = employeeRowsMap.get(assignment.employee_id);
        if (existing) {
          existing.assignmentsByDay.set(dayNumber, assignment);
        }
      });
    });

    Object.entries(optimisticAssignments).forEach(([key, assignment]) => {
      const [employeeIdStr, dayStr] = key.split('-');
      const employeeId = Number(employeeIdStr);
      const dayNumber = Number(dayStr);
      const existing = employeeRowsMap.get(employeeId);

      if (existing) {
        existing.assignmentsByDay.set(dayNumber, assignment);
      }
    });

    return Array.from(employeeRowsMap.values()).sort((a, b) => {
      const aType = a.employee.employee_type;
      const bType = b.employee.employee_type;

      if (aType === 'Manager Teknik' && bType === 'Manager Teknik') {
        const aGroup = getManagerTeknikEffectiveGroup(a.employee) || 999;
        const bGroup = getManagerTeknikEffectiveGroup(b.employee) || 999;

        if (aGroup !== bGroup) {
          return aGroup - bGroup;
        }
      }

      return a.employee.user.name.localeCompare(b.employee.user.name);
    });
  };

  const employeeRows = getEmployeeRows();

  // Get all unique managers from manager_duties in this roster period
  const getManagerEmployeeIds = (): Set<number> => {
    const managerIds = new Set<number>();
    roster.roster_days?.forEach(day => {
      day.manager_duties?.forEach(duty => {
        if (duty.duty_type === 'Manager Teknik') {
          managerIds.add(duty.employee_id);
        }
      });
    });
    return managerIds;
  };

  const managerEmployeeIds = getManagerEmployeeIds();

  // Determine effective display type for an employee
  const getEffectiveType = (employee: Employee): string => {
    const grade = employee.user.grade;
    const isManager = managerEmployeeIds.has(employee.id);
    
    // Level 15: Always display as their employee_type (CNS/Support), never as Manager
    if (grade === 15) {
      return employee.employee_type;
    }
    
    // Level 13-14: Display as Manager if they're in manager_duties, else their employee_type
    if (grade === 13 || grade === 14) {
      return isManager ? 'Manager Teknik' : employee.employee_type;
    }
    
    // Other levels: Display as their employee_type
    return employee.employee_type;
  };

  const managerTeknikCount = employeeRows.filter((row) => getEffectiveType(row.employee) === 'Manager Teknik').length;

  const getShiftBucket = (notes?: string | null, shiftName?: string | null): 'pagi' | 'siang' | 'malam' | null => {
    const note = (notes || '').toLowerCase().trim();
    const shift = (shiftName || '').toLowerCase().trim();

    if (
      note === 'l' ||
      note === 'libur' ||
      note === 'off' ||
      note.includes('libur') ||
      note.includes('off') ||
      note.includes('cuti') ||
      note.includes('tpo') ||
      note.includes('izin') ||
      note.includes('sakit')
    ) {
      return null;
    }

    if (note === 'p' || note === 'pagi' || note.includes('pagi')) return 'pagi';
    if (note === 's' || note === 'siang' || note.includes('siang')) return 'siang';
    if (note === 'm' || note === 'malam' || note.includes('malam')) return 'malam';

    if (shift.includes('libur') || shift.includes('off')) return null;
    if (shift.includes('morning') || shift.includes('pagi') || shift.includes('shift 1')) return 'pagi';
    if (shift.includes('afternoon') || shift.includes('siang') || shift.includes('shift 2')) return 'siang';
    if (shift.includes('night') || shift.includes('malam') || shift.includes('shift 3')) return 'malam';

    return null;
  };

  const shortageDetailsByDay = (() => {
    const result = new Map<number, Array<{ shiftLabel: string; missingRoles: string[] }>>();

    displayedDays.forEach((day) => {
      const counts = {
        pagi: { manager: 0, cns: 0, support: 0 },
        siang: { manager: 0, cns: 0, support: 0 },
        malam: { manager: 0, cns: 0, support: 0 },
      };

      employeeRows.forEach((row) => {
        const assignment = row.assignmentsByDay.get(day);
        if (!assignment) return;

        const shiftName = assignment.shift?.name || shifts.find((s) => s.id === assignment.shift_id)?.name || '';
        const shiftBucket = getShiftBucket(assignment.notes, shiftName);
        if (!shiftBucket) return;

        const effectiveType = getEffectiveType(row.employee);
        if (effectiveType === 'Manager Teknik') counts[shiftBucket].manager += 1;
        if (effectiveType === 'CNS') counts[shiftBucket].cns += 1;
        if (effectiveType === 'Support') counts[shiftBucket].support += 1;
      });

      const dayShortages: Array<{ shiftLabel: string; missingRoles: string[] }> = [];
      (['pagi', 'siang', 'malam'] as const).forEach((shiftKey) => {
        const shiftCount = counts[shiftKey];
        const missingRoles: string[] = [];

        if (shiftCount.manager < 1) {
          missingRoles.push(`Manager Teknik kurang ${1 - shiftCount.manager}`);
        }
        if (shiftCount.cns < 3) {
          missingRoles.push(`CNS kurang ${3 - shiftCount.cns}`);
        }
        if (shiftCount.support < 2) {
          missingRoles.push(`Support kurang ${2 - shiftCount.support}`);
        }

        if (missingRoles.length > 0) {
          const shiftLabel =
            shiftKey === 'pagi' ? 'Shift Pagi' : shiftKey === 'siang' ? 'Shift Siang' : 'Shift Malam';
          dayShortages.push({ shiftLabel, missingRoles });
        }
      });

      if (dayShortages.length > 0) {
        result.set(day, dayShortages);
      }
    });

    return result;
  })();
  const shortageDays = new Set<number>(Array.from(shortageDetailsByDay.keys()));

  // Group employees by effective type and group_number from backend
  const allGroupedData = (() => {
    // Separate by effective employee type (considering manager status)
    const typeGroups = new Map<string, Map<number, EmployeeRosterRow[]>>();
    
    employeeRows.forEach(row => {
      const type = getEffectiveType(row.employee);
      const groupNum = row.employee.group_number || 0; // Use 0 for employees without group
      
      if (!typeGroups.has(type)) {
        typeGroups.set(type, new Map());
      }
      
      const groupMap = typeGroups.get(type)!;
      if (!groupMap.has(groupNum)) {
        groupMap.set(groupNum, []);
      }
      
      groupMap.get(groupNum)!.push(row);
    });

    // Convert to array format for rendering
    const result: Array<{ type: string; groups: EmployeeRosterRow[][]; groupNumbers: number[] }> = [];
    
    // Define order: Manager Teknik, CNS, Support  
    const typeOrder = ['Manager Teknik', 'CNS', 'Support'];
    
    typeOrder.forEach(orderedType => {
      const groupMap = typeGroups.get(orderedType);
      if (!groupMap) return;

      if (orderedType === 'Manager Teknik') {
        const managerRows = Array.from(groupMap.values())
          .flat()
          .sort((a, b) => {
            const aOrder = getManagerTeknikEffectiveGroup(a.employee) || 999;
            const bOrder = getManagerTeknikEffectiveGroup(b.employee) || 999;

            if (aOrder !== bOrder) {
              return aOrder - bOrder;
            }

            return a.employee.user.name.localeCompare(b.employee.user.name);
          });

        if (managerRows.length > 0) {
          result.push({
            type: orderedType,
            groups: [managerRows],
            groupNumbers: [1],
          });
        }

        return;
      }

      const normalizedGroups = Array.from(groupMap.entries())
        .filter(([groupNum]) => groupNum > 0)
        .sort((a, b) => a[0] - b[0]);
      
      if (normalizedGroups.length > 0) {
        result.push({
          type: orderedType,
          groups: normalizedGroups.map(([_, employees]) => employees),
          groupNumbers: normalizedGroups.map(([groupNum, _]) => groupNum)
        });
      }
    });

    return result;
  })();

  const shouldShowMainHeader = allGroupedData.length > 0 && allGroupedData[0].type !== 'Manager Teknik';

  // Get employees in display order (same order as rendered in UI)
  const getDisplayOrderedEmployees = (): EmployeeRosterRow[] => {
    const orderedEmployees: EmployeeRosterRow[] = [];
    allGroupedData.forEach(typeGroup => {
      typeGroup.groups.forEach(group => {
        orderedEmployees.push(...group);
      });
    });
    return orderedEmployees;
  };

  const handlePrevWeek = () => {
    if (currentWeek > 0) setCurrentWeek(currentWeek - 1);
  };

  const handleNextWeek = () => {
    if (currentWeek < totalWeeks - 1) setCurrentWeek(currentWeek + 1);
  };

  const getWeekDateRange = () => {
    if (showFullMonth) {
      return `1 - ${daysInMonth} ${getMonthName(roster.month)}`;
    }

    const firstDay = displayedDays[0];
    const lastDay = displayedDays[displayedDays.length - 1];
    return `${firstDay} - ${lastDay} ${getMonthName(roster.month)}`;
  };

  // Get all employees with grade 13-14 (potential managers)
  const getAllGrade1314Employees = (): EmployeeRosterRow[] => {
    return employeeRows.filter(row => {
      const grade = row.employee.user.grade;
      return grade === 13 || grade === 14;
    });
  };

  // Get employees eligible to add as manager (level 13-14, not already manager)
  const getEligibleManagerCandidates = (): EmployeeRosterRow[] => {
    return getAllGrade1314Employees().filter(row => {
      const isManager = managerEmployeeIds.has(row.employee.id);
      return !isManager;
    });
  };

  // Get employees eligible to add into CNS/Support group formation
  const getEligibleGroupCandidates = (targetType: 'CNS' | 'Support', targetGroupNumber: number): EmployeeRosterRow[] => {
    return employeeRows.filter((row) => {
      const employeeType = row.employee.employee_type;
      const currentGroup = row.employee.group_number ?? 0;
      return employeeType === targetType && currentGroup !== targetGroupNumber;
    });
  };

  const getDialogCandidates = (): EmployeeRosterRow[] => {
    if (!addingManagerToGroup) return [];

    const baseCandidates = addingManagerToGroup.type === 'Manager Teknik'
      ? getEligibleManagerCandidates()
      : getEligibleGroupCandidates(addingManagerToGroup.type as 'CNS' | 'Support', addingManagerToGroup.groupNum);

    // Priority: employees without group first, then grouped employees, then by name
    return [...baseCandidates].sort((a, b) => {
      const aNoGroup = (a.employee.group_number ?? 0) <= 0;
      const bNoGroup = (b.employee.group_number ?? 0) <= 0;

      if (aNoGroup !== bNoGroup) {
        return aNoGroup ? -1 : 1;
      }

      return a.employee.user.name.localeCompare(b.employee.user.name);
    });
  };

  const normalizedAddGroupSearch = addGroupSearch.trim().toLowerCase();
  const filteredDialogCandidates = getDialogCandidates().filter((row) => {
    if (!normalizedAddGroupSearch) return true;

    const employeeName = row.employee.user.name.toLowerCase();
    const employeeType = row.employee.employee_type.toLowerCase();
    const employeeGrade = String(row.employee.user.grade ?? '');

    return (
      employeeName.includes(normalizedAddGroupSearch) ||
      employeeType.includes(normalizedAddGroupSearch) ||
      employeeGrade.includes(normalizedAddGroupSearch)
    );
  });

  const getAvailableGroupNumbersByType = (targetType: 'CNS' | 'Support'): number[] => {
    const existingTypeGroup = allGroupedData.find((grouped) => grouped.type === targetType);
    if (!existingTypeGroup) return [];

    return [...existingTypeGroup.groupNumbers]
      .filter((groupNum) => groupNum > 0)
      .sort((a, b) => a - b);
  };

  const handleOpenRemovalReassignDialog = (
    employee: Employee,
    sourceType: 'Manager Teknik' | 'CNS' | 'Support'
  ) => {
    const employeeType = employee.employee_type;

    if (employeeType !== 'CNS' && employeeType !== 'Support') {
      toast.error('Tipe karyawan tidak valid untuk pemindahan grup');
      return;
    }

    const currentGroup = employee.group_number ?? 0;
    const employeeGrade = employee.user.grade ?? 0;
    const isGrade1314 = employeeGrade === 13 || employeeGrade === 14;

    const availableDestinations: ReassignDestination[] = sourceType === 'Manager Teknik'
      ? [1, 2, 3, 4, 5].map((groupNumber) => ({ kind: 'group' as const, groupNumber }))
      : isGrade1314
        ? [
            { kind: 'manager' as const },
            ...[1, 2, 3, 4, 5]
              .filter((groupNum) => groupNum !== currentGroup)
              .map((groupNumber) => ({ kind: 'group' as const, groupNumber })),
          ]
        : getAvailableGroupNumbersByType(employeeType)
            .filter((groupNum) => groupNum !== currentGroup)
            .map((groupNumber) => ({ kind: 'group' as const, groupNumber }));

    if (availableDestinations.length === 0) {
      toast.error(`Belum ada grup ${employeeType} lain yang tersedia untuk tujuan pemindahan`);
      return;
    }

    setPendingRemovalReassign({
      employeeId: employee.id,
      employeeName: employee.user.name,
      employeeType,
      sourceType,
      employeeGrade,
      currentGroup,
      availableDestinations,
    });
  };

  const updateEmployeeGroupInRoster = (sourceRoster: RosterPeriod, employeeId: number, groupNumber: number): RosterPeriod => {
    return {
      ...sourceRoster,
      all_employees: sourceRoster.all_employees?.map((employee) =>
        employee.id === employeeId ? { ...employee, group_number: groupNumber } : employee
      ),
      roster_days: sourceRoster.roster_days?.map((day) => ({
        ...day,
        shift_assignments: day.shift_assignments?.map((assignment) =>
          assignment.employee_id === employeeId
            ? {
                ...assignment,
                employee: {
                  ...assignment.employee,
                  group_number: groupNumber,
                },
              }
            : assignment
        ),
        manager_duties: day.manager_duties?.map((duty) =>
          duty.employee_id === employeeId && duty.employee
            ? {
                ...duty,
                employee: {
                  ...duty.employee,
                  group_number: groupNumber,
                },
              }
            : duty
        ),
      })),
    };
  };

  const handleAssignManagerToGroup = async (employeeId: number, groupNumber: number) => {
    if (!canEditRoster) return;
    const previousRoster = getRosterDetail(roster.id) || roster;
    const updatedRoster = updateEmployeeGroupInRoster(previousRoster, employeeId, groupNumber);
    updateRosterDetail(roster.id, updatedRoster);
    setManagerGroupSelectorOpen(null);

    try {
      await rosterService.assignEmployeeToGroup(
        roster.id,
        employeeId,
        'Manager Teknik',
        groupNumber
      );

      const synced = await syncRosterFromServer();
      if (!synced) {
        updateRosterDetail(roster.id, previousRoster);
        toast.error('Gagal sinkronisasi data roster setelah pindah grup');
        return;
      }

      toast.success(`Manager berhasil dipindahkan ke Grup ${groupNumber}`);
    } catch (error) {
      console.error('Failed to assign manager to group:', error);
      updateRosterDetail(roster.id, previousRoster);
      toast.error('Gagal memindahkan manager ke grup');
    }
  };

  const syncRosterFromServer = async () => {
    try {
      const latestRoster = await rosterService.getRoster(roster.id);
      updateRosterDetail(roster.id, {
        ...latestRoster.roster_period,
        all_employees: latestRoster.all_employees,
        all_shifts: latestRoster.all_shifts,
      });
      return true;
    } catch (syncError) {
      console.error('Failed to sync latest roster from server:', syncError);
      return false;
    }
  };

  const handleAddManager = async (
    employeeId: number,
    options?: { showSuccessToast?: boolean }
  ): Promise<boolean> => {
    if (!canEditRoster) return false;
    const showSuccessToast = options?.showSuccessToast ?? true;

    // Close popup immediately for better UX
    setAddingManagerToGroup(null);

    // Use freshest roster from cache, fallback to prop
    const currentRoster = getRosterDetail(roster.id) || roster;

    // Build optimistic update first (no need to wait API)
    const employeeMap = new Map<number, Employee>();
    if (currentRoster.all_employees && currentRoster.all_employees.length > 0) {
      currentRoster.all_employees.forEach((employee) => {
        employeeMap.set(employee.id, employee);
      });
    }
    currentRoster.roster_days?.forEach((day) => {
      day.shift_assignments?.forEach((assignment) => {
        if (!employeeMap.has(assignment.employee_id)) {
          employeeMap.set(assignment.employee_id, assignment.employee);
        }
      });
      day.manager_duties?.forEach((duty) => {
        if (duty.employee && !employeeMap.has(duty.employee_id)) {
          employeeMap.set(duty.employee_id, duty.employee);
        }
      });
    });

    const newManager = employeeMap.get(employeeId);
    if (!newManager) {
      console.error('Manager employee data not found');
      toast.error('Data karyawan tidak ditemukan');
      return false;
    }

    const defaultShift = shifts.find((s) => s.name.toLowerCase().includes('pagi'));
    const optimisticRosterDays = currentRoster.roster_days?.map((day) => {
      const hasExisting = day.manager_duties?.some(
        (d) => d.employee_id === employeeId && d.duty_type === 'Manager Teknik'
      );

      if (hasExisting) return day;

      const newDuty: ManagerDuty = {
        id: Date.now() + Math.random(),
        roster_day_id: day.id,
        employee_id: employeeId,
        duty_type: 'Manager Teknik',
        shift_id: defaultShift?.id ?? 1,
        created_at: new Date().toISOString(),
        employee: newManager,
        shift: defaultShift,
      };

      return {
        ...day,
        manager_duties: [...(day.manager_duties || []), newDuty],
      };
    }) || [];

    const optimisticRoster: RosterPeriod = {
      ...currentRoster,
      roster_days: optimisticRosterDays,
    };

    updateRosterDetail(roster.id, optimisticRoster);

    try {
      await rosterService.addManagerToRoster(roster.id, employeeId);
      if (showSuccessToast) {
        toast.success('Manager berhasil ditambahkan');
      }
      return true;
    } catch (error) {
      console.error('Failed to add manager:', error);
      toast.error('Gagal menambahkan manager');

      // Rollback optimistic update on failure
      updateRosterDetail(roster.id, currentRoster);
      return false;
    }
  };

  const handleMoveEmployeeToManager = async (
    employeeId: number,
    employeeType: 'CNS' | 'Support'
  ) => {
    if (!canEditRoster) return;
    const currentRoster = getRosterDetail(roster.id) || roster;
    const optimisticUngroupRoster = updateEmployeeGroupInRoster(currentRoster, employeeId, 0);
    updateRosterDetail(roster.id, optimisticUngroupRoster);

    try {
      await rosterService.removeEmployeeFromGroup(roster.id, employeeId);
      const managerAdded = await handleAddManager(employeeId, { showSuccessToast: false });

      if (!managerAdded) {
        updateRosterDetail(roster.id, currentRoster);
        return;
      }

      toast.success(`${employeeType} level 13/14 berhasil dipindahkan ke Manager Teknik`);
    } catch (error) {
      console.error('Failed to move employee to manager group:', error);
      updateRosterDetail(roster.id, currentRoster);
      toast.error('Gagal memindahkan karyawan ke Manager Teknik');
    }
  };

  const handleRemoveManager = async (
    employeeId: number,
    employeeType?: 'CNS' | 'Support',
    targetGroupNumber?: number
  ) => {
    if (!canEditRoster) return;
    const currentRoster = getRosterDetail(roster.id) || roster;

    const removeManagerFromRosterDays = (sourceRosterDays: RosterPeriod['roster_days']) =>
      sourceRosterDays?.map(day => ({
        ...day,
        manager_duties: day.manager_duties?.filter(
          duty => !(duty.employee_id === employeeId && duty.duty_type === 'Manager Teknik')
        ) || []
      })) || [];

    const isReassignToGroupFlow = Boolean(employeeType && targetGroupNumber);

    if (isReassignToGroupFlow && employeeType && targetGroupNumber) {
      const rosterWithoutManagerDuty: RosterPeriod = {
        ...currentRoster,
        roster_days: removeManagerFromRosterDays(currentRoster.roster_days),
      };

      // Single optimistic update to avoid UI flip-flop during multi-request flow
      const optimisticRoster = updateEmployeeGroupInRoster(
        rosterWithoutManagerDuty,
        employeeId,
        targetGroupNumber
      );
      updateRosterDetail(roster.id, optimisticRoster);

      try {
        await rosterService.removeManagerFromRoster(roster.id, employeeId);
        await rosterService.assignEmployeeToGroup(roster.id, employeeId, employeeType, targetGroupNumber);

        const synced = await syncRosterFromServer();
        if (!synced) {
          toast.info('Perubahan tersimpan, data terbaru akan tampil penuh setelah refresh berikutnya');
        }

        toast.success(`Manager berhasil dihapus dan dipindahkan ke Grup ${targetGroupNumber}`);
      } catch (error: any) {
        console.error('Failed to move manager back to group:', error);
        updateRosterDetail(roster.id, currentRoster);

        if (error?.response?.status === 403) {
          const errorMsg = error?.response?.data?.message || 'Manager tetap tidak bisa dihapus';
          toast.error(errorMsg);
        } else {
          toast.error('Gagal memindahkan manager ke grup tujuan');
        }
      }

      return;
    }

    // Optimistic remove first
    const optimisticRosterDays = removeManagerFromRosterDays(currentRoster.roster_days);

    updateRosterDetail(roster.id, {
      ...currentRoster,
      roster_days: optimisticRosterDays
    });

    try {
      await rosterService.removeManagerFromRoster(roster.id, employeeId);

      const synced = await syncRosterFromServer();
      if (!synced) {
        toast.info('Perubahan tersimpan, data terbaru akan tampil penuh setelah refresh berikutnya');
      }

      toast.success('Manager berhasil dihapus');
    } catch (error: any) {
      console.error('Failed to remove manager:', error);

      // Rollback optimistic update on failure
      updateRosterDetail(roster.id, currentRoster);
      
      // Check if it's a fixed manager error
      if (error?.response?.status === 403) {
        const errorMsg = error?.response?.data?.message || 'Manager tetap tidak bisa dihapus';
        toast.error(errorMsg);
      } else {
        toast.error('Gagal menghapus manager');
      }
    }
  };

  const handleAssignEmployeeToGroup = async (
    employeeId: number,
    employeeType: 'CNS' | 'Support',
    groupNumber: number
  ) => {
    if (!canEditRoster) return;
    setAddingManagerToGroup(null);

    const currentRoster = getRosterDetail(roster.id) || roster;
    const optimisticRoster = updateEmployeeGroupInRoster(currentRoster, employeeId, groupNumber);
    updateRosterDetail(roster.id, optimisticRoster);

    try {
      await rosterService.assignEmployeeToGroup(roster.id, employeeId, employeeType, groupNumber);
      const synced = await syncRosterFromServer();
      if (!synced) {
        updateRosterDetail(roster.id, currentRoster);
        toast.error('Gagal sinkronisasi data roster setelah pindah grup');
        return;
      }
      toast.success(`${employeeType} berhasil dipindahkan ke Grup ${groupNumber}`);
    } catch (error) {
      console.error('Failed to assign employee to group:', error);
      updateRosterDetail(roster.id, currentRoster);
      toast.error('Gagal memindahkan karyawan ke grup');
    }
  };

  const handleRemoveEmployeeFromGroup = async (
    employeeId: number,
    employeeType: 'CNS' | 'Support',
    targetGroupNumber?: number
  ) => {
    if (!canEditRoster) return;
    const currentRoster = getRosterDetail(roster.id) || roster;
    const nextGroupNumber = targetGroupNumber ?? 0;
    const optimisticRoster = updateEmployeeGroupInRoster(currentRoster, employeeId, nextGroupNumber);
    updateRosterDetail(roster.id, optimisticRoster);

    try {
      if (targetGroupNumber) {
        await rosterService.assignEmployeeToGroup(roster.id, employeeId, employeeType, targetGroupNumber);
        const synced = await syncRosterFromServer();
        if (!synced) {
          updateRosterDetail(roster.id, currentRoster);
          toast.error('Gagal sinkronisasi data roster setelah pindah grup');
          return;
        }
        toast.success(`${employeeType} berhasil dipindahkan ke Grup ${targetGroupNumber}`);
      } else {
        await rosterService.removeEmployeeFromGroup(roster.id, employeeId);
        const synced = await syncRosterFromServer();
        if (!synced) {
          updateRosterDetail(roster.id, currentRoster);
          toast.error('Gagal sinkronisasi data roster setelah keluar dari grup');
          return;
        }
        toast.success(`${employeeType} berhasil dikeluarkan dari formasi grup`);
      }
    } catch (error) {
      console.error('Failed to remove employee from group:', error);
      updateRosterDetail(roster.id, currentRoster);
      toast.error(targetGroupNumber ? 'Gagal memindahkan karyawan ke grup tujuan' : 'Gagal mengeluarkan karyawan dari grup');
    }
  };

  const handleConfirmRemovalReassign = async (destination: ReassignDestination) => {
    if (!canEditRoster) return;
    if (!pendingRemovalReassign) return;

    const pendingAction = pendingRemovalReassign;
    setPendingRemovalReassign(null);

    if (destination.kind === 'manager') {
      await handleMoveEmployeeToManager(
        pendingAction.employeeId,
        pendingAction.employeeType
      );
      return;
    }

    if (pendingAction.sourceType === 'Manager Teknik') {
      await handleRemoveManager(
        pendingAction.employeeId,
        pendingAction.employeeType,
        destination.groupNumber
      );
      return;
    }

    await handleRemoveEmployeeFromGroup(
      pendingAction.employeeId,
      pendingAction.employeeType,
      destination.groupNumber
    );
  };

  // Console debug for troubleshooting
  React.useEffect(() => {
    console.log('≡ƒöì RosteredStaffPersonView Debug:');
    console.log('  canEdit:', canEdit);
    console.log('  isRosterPublished:', isRosterPublished);
    console.log('  canEditRoster:', canEditRoster);
    console.log('  user?.role:', user?.role);
    console.log('  employeeRows count:', employeeRows.length);
    console.log('  managerEmployeeIds:', Array.from(managerEmployeeIds));
    console.log('  allGrade1314Employees:', getAllGrade1314Employees().map(r => ({
      id: r.employee.id,
      name: r.employee.user.name,
      grade: r.employee.user.grade,
      isManager: managerEmployeeIds.has(r.employee.id)
    })));
    console.log('  allGroupedData types:', allGroupedData.map(g => ({ type: g.type, groupCount: g.groups.length })));
  }, []);

  const selectedToolbarEmployee = selectedCells.length === 1
    ? getAllUniqueEmployees().get(selectedCells[0].employeeId)
    : null;
  const isToolbarSelectionManager = selectedToolbarEmployee?.employee_type === 'Manager Teknik';
  const generalManagerName = Array.from(getAllUniqueEmployees().values()).find(
    (employee) => employee.employee_type === 'General Manager'
  )?.user.name || 'GENERAL MANAGER';
  const creatorEmployee = user
    ? Array.from(getAllUniqueEmployees().values()).find((employee) => employee.user.id === user.id)
    : null;
  const creatorRoleLabel = (() => {
    if (creatorEmployee?.employee_type === 'Manager Teknik') {
      const managerGroup = getManagerTeknikEffectiveGroup(creatorEmployee);
      return managerGroup ? `MANAGER TEKNIK ${managerGroup}` : 'MANAGER TEKNIK';
    }

    if (user?.role) {
      return user.role.toUpperCase();
    }

    return 'PEMBUAT';
  })();
  const creatorNameLabel = (creatorEmployee?.user.name || user?.name || 'PENGGUNA').toUpperCase();
  const printDateLabel = showFullMonth
    ? `TANGGAL : 1 - ${daysInMonth} ${getMonthName(roster.month)} ${roster.year}`
    : `TANGGAL : ${getWeekDateRange()} ${roster.year}`;
  const handlePrintRoster = () => {
    window.print();
  };

  const handleShortageDayClick = (day: number) => {
    if (!shortageDays.has(day)) return;
    setSelectedShortageDay(day);
  };

  const selectedShortageDetails = selectedShortageDay !== null
    ? (shortageDetailsByDay.get(selectedShortageDay) || [])
    : [];

  const shortageModal =
    selectedShortageDay !== null &&
    selectedShortageDetails.length > 0 &&
    typeof document !== 'undefined'
      ? createPortal(
          <div
            className="print-hidden fixed inset-0 z-[9999] bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4"
            onClick={() => setSelectedShortageDay(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-red-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-red-100 bg-red-50 rounded-t-2xl">
                <div className="text-base sm:text-lg font-bold text-red-700">
                  Kekurangan Karyawan Tanggal {selectedShortageDay}
                </div>
              </div>

              <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2 max-h-[60vh] overflow-y-auto">
                {selectedShortageDetails.map((item) => (
                  <div key={`${selectedShortageDay}-${item.shiftLabel}`} className="text-sm text-red-800">
                    <span className="font-semibold">{item.shiftLabel}:</span> {item.missingRoles.join(', ')}
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 sm:px-5 sm:py-4 border-t border-red-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedShortageDay(null)}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 -mx-2 sm:mx-0 p-4 sm:p-5 lg:p-7 xl:p-8 overflow-visible isolate">
      <RosteredStaffPrintStyles />

      <RosteredStaffHeader
        showFullMonth={showFullMonth}
        currentWeek={currentWeek}
        totalWeeks={totalWeeks}
        title={`${getWeekDateRange()} ${roster.year}`}
        subtitle={showFullMonth ? 'Mode: Sebulan Penuh' : `Week ${currentWeek + 1} of ${totalWeeks}`}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onPrint={handlePrintRoster}
      />

      <div className="flex items-center justify-center mb-4 sm:mb-6">
        <div className="w-full max-w-none rounded-2xl border border-[#222E6A]/20 bg-gradient-to-r from-[#f8f9ff] via-white to-[#f8f9ff] px-4 py-3 sm:px-5 sm:py-4 shadow-sm">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-semibold text-[#222E6A]">Mode Tampilan Bulanan</p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                Aktifkan untuk menampilkan tanggal 1 sampai akhir bulan tanpa pagination.
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className={`text-[10px] sm:text-xs font-semibold ${showFullMonth ? 'text-[#222E6A]' : 'text-gray-500'}`}>
                {showFullMonth ? 'Sebulan Penuh' : 'Mingguan'}
              </span>
              <span className="relative inline-flex h-7 w-12 sm:h-8 sm:w-14 items-center">
                <input
                  type="checkbox"
                  checked={showFullMonth}
                  onChange={(e) => setShowFullMonth(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-gray-300 peer-checked:bg-[#222E6A] transition-colors"></span>
                <span className="absolute left-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 sm:peer-checked:translate-x-6"></span>
              </span>
            </div>
          </label>
        </div>
      </div>

      {shortageModal}

      {/* Week Navigation Pills */}
      {!showFullMonth && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 flex-wrap">
          {weeks.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentWeek(index)}
              className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium transition-all ${
                index === currentWeek
                  ? 'bg-[#222E6A] text-white scale-110'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}

      {/* Clear float from manager info box */}
      <div className="clear-both"></div>

      {/* Roster Table - Person View */}
      <div 
        ref={tableContainerRef}
        className="roster-print-area overflow-x-auto overflow-y-visible w-full rounded-2xl relative touch-pan-x"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="print-only-main-title hidden">
          <div className="print-roster-title">JADWAL DINAS TEKNIK ( MT & PT MT )</div>
          <div className="print-roster-subtitle">BULAN : {`${getMonthName(roster.month)} ${roster.year}`}</div>
          <div className="print-roster-date">{printDateLabel}</div>
        </div>

        <table className={`${showFullMonth ? 'w-max min-w-[1120px] sm:min-w-[1280px]' : 'w-full min-w-[640px] sm:min-w-[980px]'} border-collapse table-layout-fixed`} style={{ tableLayout: 'auto' }}>
          {shouldShowMainHeader && (
            <thead className="sticky top-0 z-30">
              <tr>
                <th
                  className="text-left text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-3 sm:px-4 py-2 sm:py-3 rounded-tl-xl whitespace-nowrap sticky left-0 top-0 z-40"
                  style={{
                    backgroundColor: '#222E6A',
                    width: `${stickyNameWidth}px`,
                    minWidth: `${stickyNameWidth}px`,
                    maxWidth: `${stickyNameWidth}px`,
                    boxSizing: 'border-box',
                  }}
                >
                  Name
                </th>
                <th
                  className={`text-center text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap top-0 ${shouldStickyMetaColumns ? 'sticky z-40' : 'z-30'}`}
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
                </th>
                <th
                  className={`text-center text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap top-0 ${shouldStickyMetaColumns ? 'sticky z-40' : 'z-30'}`}
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
                </th>
                {displayedDays.map((day) => (
                  <th
                    key={day}
                    className={`text-center font-semibold text-white sticky top-0 z-30 ${showFullMonth ? 'px-1 py-2 text-[10px]' : 'px-1.5 py-2 text-[9px] sm:text-xs lg:text-sm sm:px-3 sm:py-3'} ${shortageDays.has(day) ? 'cursor-pointer' : ''}`}
                    style={{ 
                      backgroundColor: shortageDays.has(day) ? '#dc2626' : '#222E6A',
                      width: `${dayColumnWidth}px`,
                      minWidth: `${dayColumnWidth}px`,
                      maxWidth: `${dayColumnWidth}px`,
                      boxSizing: 'border-box',
                    }}
                    onClick={() => {
                      if (shortageDays.has(day)) {
                        handleShortageDayClick(day);
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
                    <div className={`${showFullMonth ? 'text-[8px]' : 'text-[7px] sm:text-[10px]'} text-white/70 leading-none`}>{getDayName(roster.year, roster.month, day)}</div>
                    <div className="font-bold leading-none mt-0.5">{day}</div>
                  </th>
                ))}
                <th className="w-6 sm:w-12 rounded-tr-xl sticky top-0 z-30" style={{ backgroundColor: '#222E6A' }}></th>
              </tr>
            </thead>
          )}
          <tbody>
            {allGroupedData.length === 0 ? (
              <tr>
                <td colSpan={displayedDays.length + 4} className="text-center py-12 text-gray-500">
                  {showFullMonth ? 'No staff assigned for this month' : 'No staff assigned for this week'}
                </td>
              </tr>
            ) : (
              allGroupedData.map((typeGroup, typeIndex) => (
                <React.Fragment key={`type-${typeGroup.type}`}>
                  {typeGroup.type === 'CNS' && (
                    <>
                      <tr className="print-only-cns-title hidden">
                        <td colSpan={displayedDays.length + 4}>
                          <div className="print-roster-title">JADWAL DINAS TEKNIK TELEKOMUNIKASI</div>
                          <div className="print-roster-subtitle">BULAN : {`${getMonthName(roster.month)} ${roster.year}`}</div>
                          <div className="print-roster-date">{printDateLabel}</div>
                        </td>
                      </tr>
                    </>
                  )}
                  {typeGroup.type === 'Support' && (
                    <>
                      <tr className="print-only-support-title hidden">
                        <td colSpan={displayedDays.length + 4}>
                          <div className="print-roster-title">JADWAL DINAS TEKNIK FASILITAS PENUNJANG</div>
                          <div className="print-roster-subtitle">BULAN : {`${getMonthName(roster.month)} ${roster.year}`}</div>
                          <div className="print-roster-date">{printDateLabel}</div>
                        </td>
                      </tr>
                    </>
                  )}

                  <SectionTableDividerRows
                    isFirstSection={typeIndex === 0}
                    showColumnsHeader={false}
                    totalColSpan={displayedDays.length + 4}
                    displayedDays={displayedDays}
                    dayNames={displayedDayNames}
                    stickyNameWidth={stickyNameWidth}
                    stickyGradeWidth={stickyGradeWidth}
                    stickyRoleWidth={stickyRoleWidth}
                    stickyGradeLeft={stickyGradeLeft}
                    stickyRoleLeft={stickyRoleLeft}
                    dayColumnWidth={dayColumnWidth}
                    showFullMonth={showFullMonth}
                    shortageDays={shortageDays}
                    shortageDetailsByDay={shortageDetailsByDay}
                    onShortageDayClick={handleShortageDayClick}
                    shouldStickyMetaColumns={shouldStickyMetaColumns}
                  />

                  {/* Employee Type Header */}
                  <tr className="print-type-header">
                    <td 
                      colSpan={3}
                      className="px-3 sm:px-4 py-3 text-sm sm:text-base font-bold text-white border-y-2 border-[#1a235c] sticky left-0 z-30"
                      style={{
                        backgroundColor: '#222E6A',
                        width: `${stickySectionWidth}px`,
                        minWidth: `${stickySectionWidth}px`,
                        maxWidth: `${stickySectionWidth}px`,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div>{typeGroup.type}</div>
                      <div className="print-section-date hidden">{printDateLabel}</div>
                    </td>
                    <td
                      colSpan={displayedDays.length + 1}
                      className="px-0 py-3 border-y-2 border-[#1a235c]"
                      style={{ backgroundColor: '#222E6A' }}
                    ></td>
                  </tr>
                  
                  {/* Groups within this type */}
                  {typeGroup.groups.map((group, groupIndex) => {
                    const actualGroupNumber = typeGroup.groupNumbers[groupIndex];
                    
                    return (
                      <React.Fragment key={`${typeGroup.type}-${groupIndex}`}>
                        {/* Group Header Row (hidden for Manager Teknik) */}
                        {typeGroup.type !== 'Manager Teknik' && (
                          <tr>
                            <td 
                              colSpan={3}
                              className="px-3 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-[#1f2a5a] border-y border-[#c7d2ff] sticky left-0 z-30"
                              style={{
                                backgroundColor: '#e8edff',
                                width: `${stickySectionWidth}px`,
                                minWidth: `${stickySectionWidth}px`,
                                maxWidth: `${stickySectionWidth}px`,
                                boxSizing: 'border-box',
                              }}
                            >
                              Grup {actualGroupNumber}
                            </td>
                            <td
                              colSpan={displayedDays.length + 1}
                              className="px-0 py-2 border-y border-[#c7d2ff]"
                              style={{ backgroundColor: '#e8edff' }}
                            ></td>
                          </tr>
                        )}
                        {renderGroupDateHeader(`${typeGroup.type}-${actualGroupNumber}-${groupIndex}`)}
                      
                      {/* Employee Rows in Group */}
                      {group.map((row, rowIndexInGroup) => {
                        const isLastRowInGroup = rowIndexInGroup === group.length - 1;
                        const isLastGroup = typeIndex === allGroupedData.length - 1 && groupIndex === typeGroup.groups.length - 1;
                        const isManagerGroupPopupOpen = managerGroupSelectorOpen === row.employee.id;
                        
                        return (
                          <tr key={row.employee.id} className={`hover:bg-gray-50 transition-colors ${isManagerGroupPopupOpen ? 'relative z-[140]' : ''}`}>
                            <td
                              className={`px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 sticky left-0 bg-white overflow-visible ${isManagerGroupPopupOpen ? 'z-[150]' : 'z-10'} ${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''}`}
                              style={{
                                width: `${stickyNameWidth}px`,
                                minWidth: `${stickyNameWidth}px`,
                                maxWidth: `${stickyNameWidth}px`,
                                boxSizing: 'border-box',
                              }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-gray-500 font-normal">{rowIndexInGroup + 1}</span>
                                <span className="whitespace-nowrap overflow-hidden text-ellipsis block min-w-0">{row.employee.user.name}</span>

                                {typeGroup.type === 'Manager Teknik' && canEditRoster && (
                                  <div className="relative ml-auto" data-group-selector>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setManagerGroupSelectorOpen((prev) => (prev === row.employee.id ? null : row.employee.id));
                                      }}
                                      className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-[#e8edff] text-[#1f2a5a] hover:bg-[#dce4ff] transition-colors border border-[#b8c6ff]"
                                      title="Klik untuk pilih grup"
                                    >
                                      Grup {row.employee.group_number || '-'}
                                    </button>
                                    {managerGroupSelectorOpen === row.employee.id && (
                                      <div
                                        data-group-selector
                                        className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-[220] p-2 flex flex-col gap-1 min-w-[110px]"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {[1, 2, 3, 4, 5].map((groupNum) => (
                                          <button
                                            key={groupNum}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (row.employee.group_number !== groupNum) {
                                                handleAssignManagerToGroup(row.employee.id, groupNum);
                                              } else {
                                                setManagerGroupSelectorOpen(null);
                                              }
                                            }}
                                            className={`px-3 py-1.5 text-[10px] font-semibold rounded transition-colors text-left ${
                                              row.employee.group_number === groupNum
                                                ? 'bg-[#222E6A] text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                          >
                                            Grup {groupNum}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Only show badge or remove button for Manager Teknik group */}
                                {typeGroup.type === 'Manager Teknik' && (
                                  <>
                                    {/* Show fixed badge for fixed managers */}
                                    {row.employee.is_fixed_manager === true && (
                                      <span className="flex-shrink-0 px-2 py-1 text-xs font-bold text-white bg-green-600 rounded" title="Manager tetap, tidak bisa dihapus">
                                        FIXED
                                      </span>
                                    )}
                                    {/* Remove button for removable managers: not fixed and grade not 15 */}
                                    {row.employee.is_fixed_manager !== true && row.employee.user.grade !== 15 && canEditRoster && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenRemovalReassignDialog(row.employee, 'Manager Teknik');
                                        }}
                                        className="flex-shrink-0 px-2 py-1 text-xs font-medium text-red-600 hover:text-white bg-red-100 hover:bg-red-500 rounded transition-colors"
                                        title="Hapus dari Manager"
                                      >
                                        -
                                      </button>
                                    )}
                                  </>
                                )}
                                {(typeGroup.type === 'CNS' || typeGroup.type === 'Support') && canEditRoster && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenRemovalReassignDialog(row.employee, typeGroup.type as 'CNS' | 'Support');
                                    }}
                                    className="ml-auto flex-shrink-0 px-2 py-1 text-xs font-medium text-red-600 hover:text-white bg-red-100 hover:bg-red-500 rounded transition-colors"
                                    title={`Hapus dari Grup ${typeGroup.type}`}
                                  >
                                    -
                                  </button>
                                )}
                              </div>
                            </td>
                            <td
                              className={`px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs lg:text-sm text-gray-700 bg-white ${shouldStickyMetaColumns ? 'sticky z-10' : 'z-0'} ${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''}`}
                              style={{
                                ...(shouldStickyMetaColumns ? { left: `${stickyGradeLeft}px` } : {}),
                                width: `${stickyGradeWidth}px`,
                                minWidth: `${stickyGradeWidth}px`,
                                maxWidth: `${stickyGradeWidth}px`,
                                boxSizing: 'border-box',
                              }}
                            >
                              {row.employee.user.grade || '-'}
                            </td>
                            <td
                              className={`px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs lg:text-sm text-gray-700 bg-white ${shouldStickyMetaColumns ? 'sticky z-10' : 'z-0'} ${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''}`}
                              style={{
                                ...(shouldStickyMetaColumns ? { left: `${stickyRoleLeft}px` } : {}),
                                width: `${stickyRoleWidth}px`,
                                minWidth: `${stickyRoleWidth}px`,
                                maxWidth: `${stickyRoleWidth}px`,
                                boxSizing: 'border-box',
                              }}
                            >
                              {row.employee.employee_type}
                            </td>
                            {(() => {
                              const cells: React.ReactElement[] = [];
                              const rendereddDays = new Set<number>();
                              
                              displayedDays.forEach((day) => {
                                // Skip if this day was already covered by a previous merged cell
                                if (rendereddDays.has(day)) {
                                  return;
                                }
                                
                                // Get assignment for current day
                                const assignment = row.assignmentsByDay.get(day);
                                const shift = assignment ? shifts.find(s => s.id === assignment.shift_id) : null;
                                const hasNotes = assignment?.notes && assignment.notes.trim() !== '';
                                const displayText = hasNotes ? cleanNotesText(assignment.notes!) : (shift ? getShiftDisplayText(shift.name) : '');
                                
                                // Calculate colspan by checking consecutive days with same notes/shift
                                let colSpan = 1;
                                rendereddDays.add(day);
                                
                                if (assignment) {
                                  const assignmentIsLibur = isLiburValue(assignment.notes, shift?.name);

                                  // Libur cells should always be per-day (never merged)
                                  if (assignmentIsLibur) {
                                    colSpan = 1;
                                  } else {
                                  // Look ahead to merge consecutive cells with the same notes
                                  const currentNotes = assignment.notes?.trim().toLowerCase() || '';
                                  const currentShiftId = assignment.shift_id;
                                  
                                  for (let nextDay = day + 1; nextDay <= displayedDays[displayedDays.length - 1]; nextDay++) {
                                    if (!displayedDays.includes(nextDay)) break;
                                    
                                    const nextAssignment = row.assignmentsByDay.get(nextDay);
                                    if (!nextAssignment) break;
                                    
                                    const nextNotes = nextAssignment.notes?.trim().toLowerCase() || '';
                                    const nextShiftId = nextAssignment.shift_id;
                                    
                                    // Merge if both notes and shift_id match
                                    if (currentNotes === nextNotes && currentShiftId === nextShiftId) {
                                      colSpan++;
                                      rendereddDays.add(nextDay);
                                    } else {
                                      break;
                                    }
                                  }
                                  }
                                }
                                
                                const tooltipText = hasNotes
                                  ? `${shift?.name || 'Shift'}: ${assignment.notes}` 
                                  : (shift ? `${shift.name}${shift.start_time && shift.end_time ? ': ' + shift.start_time.slice(0, 5) + ' - ' + shift.end_time.slice(0, 5) : ''}` : 'No shift');
                                
                                // Determine cell styling
                                // Check if any day in this merged cell is selected
                                const hasSelectedDay = (() => {
                                  for (let d = day; d < day + colSpan; d++) {
                                    if (isCellSelected(row.employee.id, d)) return true;
                                  }
                                  return false;
                                })();

                                const cellClasses = hasSelectedDay
                                  ? 'bg-blue-200 border-2 border-blue-500 shadow-lg'
                                  : (assignment 
                                      ? (hasNotes 
                                          ? getNotesClasses(assignment.notes!) + (canEditRoster ? ' shadow-sm hover:shadow-md cursor-pointer' : ' shadow-sm')
                                          : (shift ? getShiftClasses(shift.name) + (canEditRoster ? ' shadow-sm hover:shadow-md cursor-pointer' : ' shadow-sm') : 'bg-gray-100')
                                        )
                                      : 'bg-gray-100');
                                
                                const isEditing = editingCell?.employeeId === row.employee.id && editingCell?.day === day;
                                
                                cells.push(
                                  <td 
                                    key={`${row.employee.id}-${day}`} 
                                    colSpan={colSpan}
                                    className={`${showFullMonth ? 'px-0.5 py-1.5' : 'px-1 sm:px-2 py-2 sm:py-3'} ${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''} relative`}
                                    style={{
                                      ...(showFullMonth ? {
                                        width: `${colSpan * 40}px`,
                                        minWidth: `${colSpan * 40}px`,
                                        maxWidth: `${colSpan * 40}px`,
                                      } : {}),
                                      boxSizing: 'border-box',
                                    }}
                                  >
                                    {isEditing ? (
                                      <div 
                                        ref={dropdownRef}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute top-0 left-0 right-0 z-30 bg-white rounded-lg shadow-xl border border-gray-300 min-w-[160px]"
                                      >
                                        <div className="p-2">
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                              {shiftOptions.map(option => (
                                                <button
                                                  key={option.value}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShiftChange(row.employee.id, day, option.value);
                                                  }}
                                                  className="px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-[#222E6A] hover:text-white rounded transition-colors text-center"
                                                >
                                                  {option.label}
                                                </button>
                                              ))}
                                            </div>
                                            <div className="border-t pt-2 mt-2">
                                              <div className="grid grid-cols-2 gap-1 mb-2">
                                                {specialStatusOptions.map((statusOption) => (
                                                  <button
                                                    key={statusOption.note}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleShiftChange(row.employee.id, day, shiftOptions[0].value, statusOption.note);
                                                    }}
                                                    className="px-2 py-1.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-700 hover:text-white rounded transition-colors text-center"
                                                  >
                                                    {statusOption.label}
                                                  </button>
                                                ))}
                                              </div>
                                              <input
                                                ref={inputRef}
                                                type="text"
                                                value={customText}
                                                onChange={(e) => setCustomText(e.target.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' && customText.trim()) {
                                                    e.stopPropagation();
                                                    handleShiftChange(row.employee.id, day, shiftOptions[0].value, customText.trim());
                                                  }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                placeholder="Ketik custom..."
                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-[#222E6A] mb-1"
                                              />
                                              {customText.trim() && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShiftChange(row.employee.id, day, shiftOptions[0].value, customText.trim());
                                                  }}
                                                  className="w-full px-2 py-1.5 text-xs font-medium bg-[#222E6A] text-white rounded hover:bg-[#1a2350] transition-colors mb-1"
                                                >
                                                  Simpan
                                                </button>
                                              )}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingCell(null);
                                                }}
                                                className="w-full px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                              >
                                                Batal
                                              </button>
                                            </div>
                                          </div>
                                      </div>
                                    ) : null}
                                    <div
                                      ref={(el) => {
                                        if (el) {
                                          cellRefs.current.set(`${row.employee.id}-${day}`, el);
                                        }
                                      }}
                                      onMouseDown={(e) => {
                                        const target = e.currentTarget;
                                        handleCellMouseDown(row.employee.id, day, colSpan, e.clientX, target, e);
                                      }}
                                      onMouseEnter={() => handleCellMouseEnter(row.employee.id, day, colSpan)}
                                      onDoubleClick={(e) => handleCellDoubleClick(row.employee.id, day, e)}
                                      className={`${showFullMonth ? 'h-7 text-[9px]' : 'h-8 sm:h-10 text-[9px] sm:text-xs'} w-full rounded-lg flex items-center justify-center font-semibold transition-all ${cellClasses} ${canEditRoster && !isEditing ? 'cursor-pointer hover:ring-2 hover:ring-[#222E6A] hover:ring-offset-1' : ''} relative group select-none`}
                                      title={tooltipText}
                                    >
                                      {displayText}
                                      {/* Show day numbers for selected days in merged cells */}
                                      {hasSelectedDay && colSpan > 1 && (
                                        <div className="absolute top-0 left-0 right-0 flex text-[8px] text-blue-700 font-bold pointer-events-none">
                                          {Array.from({ length: colSpan }, (_, i) => day + i).map(d => (
                                            isCellSelected(row.employee.id, d) && (
                                              <div key={d} className="flex-1 text-center">{d}</div>
                                            )
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              });
                              
                              return cells;
                            })()}
                            <td className={`${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''}`}></td>
                          </tr>
                        );
                      })}
                      
                      {/* Add button rows for Manager/CNS/Support group formation */}
                      {typeGroup.type === 'Manager Teknik' && canEditRoster && managerTeknikCount < 5 && getEligibleManagerCandidates().length > 0 && (
                        <tr className="print-hidden">
                          <td 
                            colSpan={3}
                            className="px-3 sm:px-4 py-2 bg-blue-50 border-b border-blue-200 sticky left-0 z-10"
                          >
                            <button
                              onClick={() => setAddingManagerToGroup({ type: typeGroup.type, groupNum: actualGroupNumber })}
                              className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-blue-600 hover:text-white bg-blue-100 hover:bg-blue-500 rounded-lg transition-colors"
                            >
                              <span className="text-lg leading-none">+</span>
                              <span>Tambah Manager</span>
                            </button>
                          </td>
                          <td colSpan={displayedDays.length + 1} className="py-2 bg-blue-50 border-b border-blue-200"></td>
                        </tr>
                      )}
                      {(typeGroup.type === 'CNS' || typeGroup.type === 'Support') && canEditRoster && getEligibleGroupCandidates(typeGroup.type as 'CNS' | 'Support', actualGroupNumber).length > 0 && (
                        <tr className="print-hidden">
                          <td
                            colSpan={3}
                            className="px-3 sm:px-4 py-2 bg-blue-50 border-b border-blue-200 sticky left-0 z-10"
                          >
                            <button
                              onClick={() => setAddingManagerToGroup({ type: typeGroup.type, groupNum: actualGroupNumber })}
                              className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-blue-600 hover:text-white bg-blue-100 hover:bg-blue-500 rounded-lg transition-colors"
                            >
                              <span className="text-lg leading-none">+</span>
                              <span>{`Tambah ${typeGroup.type}`}</span>
                            </button>
                          </td>
                          <td colSpan={displayedDays.length + 1} className="py-2 bg-blue-50 border-b border-blue-200"></td>
                        </tr>
                      )}
                      {typeGroup.type === 'Manager Teknik' && groupIndex === typeGroup.groups.length - 1 && (
                        <tr className="print-only-general-manager hidden print-signature-row">
                          <td colSpan={displayedDays.length + 4}>
                            <div className="print-signature-title">Menyetujui,<br />General Manager</div>
                            <div className="print-signature-name">{generalManagerName}</div>
                          </td>
                        </tr>
                      )}
                      {(typeGroup.type === 'CNS' || typeGroup.type === 'Support') && groupIndex === typeGroup.groups.length - 1 && (
                        <tr className="print-only-creator hidden print-signature-row">
                          <td colSpan={displayedDays.length + 4}>
                            <div className="print-signature-title">Dibuat,<br />{creatorRoleLabel}</div>
                            <div className="print-signature-name">{creatorNameLabel}</div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Multi-Selection Toolbar */}
      {canEditRoster && selectedCells.length > 0 && toolbarPosition && !isSelecting && (
        <div 
          className="fixed z-50 transition-all duration-200 ease-out"
          style={{
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`
          }}
        >
            <div className="bg-white rounded-lg shadow-2xl border-2 border-[#222E6A] p-4 min-w-[320px] max-w-[400px]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-800">
                  {selectedCells.length} cell dipilih
                </div>
                <button
                  onClick={() => setSelectedCells([])}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded"
                >
                  Clear
                </button>
              </div>

              {/* Auto-fill Pattern Toggle */}
              {selectedCells.length === 1 && (
                <div className="mb-3 space-y-2">
                  <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoFillPattern}
                        onChange={(e) => setAutoFillPattern(e.target.checked)}
                        className="w-4 h-4 text-[#222E6A] border-gray-300 rounded focus:ring-[#222E6A] focus:ring-2"
                      />
                      <span className="ml-2 text-xs font-medium text-gray-700">
                        Isi Otomatis Pattern (S - P - M - L - L)
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
                        onChange={(e) => setApplyToGroup(e.target.checked)}
                        className="w-4 h-4 text-[#222E6A] border-gray-300 rounded focus:ring-[#222E6A] focus:ring-2"
                      />
                      <span className="ml-2 text-xs font-medium text-gray-700">
                        Terapkan ke Grup Terkait
                      </span>
                    </label>
                    {isToolbarSelectionManager && (
                      <p className="mt-1 text-[10px] text-blue-700 ml-6">
                        Untuk Manager Teknik: mode ini menargetkan Manager + CNS + Support pada grup yang sama.
                      </p>
                    )}
                    {applyToGroup && !autoFillPattern && (
                      <p className="mt-1 text-[10px] text-gray-600 ml-6">
                        {isToolbarSelectionManager
                          ? 'Akan mengubah Manager, CNS, dan Support dalam grup yang dipimpin manager untuk tanggal ini.'
                          : 'Akan mengubah semua karyawan dalam grup untuk tanggal ini'}
                      </p>
                    )}
                    {applyToGroup && autoFillPattern && (
                      <p className="mt-1 text-[10px] text-gray-600 ml-6">
                        {isToolbarSelectionManager
                          ? 'Pattern manager akan diterapkan ke CNS dan Support pada grup yang sama sampai akhir bulan.'
                          : 'Akan mengubah semua karyawan dalam grup dengan pattern sampai akhir bulan'}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-2 mb-3">
                {shiftOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleMultiShiftChange(option.value)}
                    className="px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-[#222E6A] hover:text-white rounded transition-colors text-center"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="border-t pt-3 mb-3">
                <div className="text-[10px] text-gray-500 mb-2">Status Cepat</div>
                <div className="grid grid-cols-2 gap-2">
                  {specialStatusOptions.map((statusOption) => (
                    <button
                      key={`multi-${statusOption.note}`}
                      onClick={() => handleMultiShiftChange(shiftOptions[0].value, statusOption.note)}
                      className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-700 hover:text-white rounded transition-colors text-center"
                    >
                      {statusOption.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customText.trim()) {
                      handleMultiShiftChange(shiftOptions[0].value, customText.trim());
                      setCustomText('');
                    }
                  }}
                  placeholder="Custom text untuk semua cell..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-[#222E6A] mb-2"
                />
                {customText.trim() && (
                  <button
                    onClick={() => {
                      handleMultiShiftChange(shiftOptions[0].value, customText.trim());
                      setCustomText('');
                    }}
                    className="w-full px-3 py-2 text-xs font-medium bg-[#222E6A] text-white rounded hover:bg-[#1a2350] transition-colors"
                  >
                    Terapkan ke {selectedCells.length} cell
                  </button>
                )}
              </div>

              <div className="mt-3 text-[10px] text-gray-500 text-center">
                Klik sel untuk pilih | Drag untuk pilih banyak | Shift/Ctrl+Klik untuk toggle | Double-click untuk edit single
              </div>
            </div>
          </div>
        )}

      {/* Add Manager Dialog */}
      {addingManagerToGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 max-h-96 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Tambah {addingManagerToGroup.type} untuk Grup {addingManagerToGroup.groupNum}</h3>
              <button
                onClick={() => setAddingManagerToGroup(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ├ù
              </button>
            </div>

            <div className="mb-3">
              <input
                type="text"
                value={addGroupSearch}
                onChange={(e) => setAddGroupSearch(e.target.value)}
                placeholder="Cari nama / level / tipe karyawan..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#222E6A]"
              />
              <p className="mt-1 text-xs text-gray-500">
                Menampilkan {filteredDialogCandidates.length} kandidat
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredDialogCandidates.map(row => {
                const currentGroup = row.employee.group_number ?? 0;
                const isUngrouped = currentGroup <= 0;

                return (
                <button
                  key={row.employee.id}
                  onClick={() => {
                    if (addingManagerToGroup.type === 'Manager Teknik') {
                      handleAddManager(row.employee.id);
                    } else {
                      handleAssignEmployeeToGroup(
                        row.employee.id,
                        addingManagerToGroup.type as 'CNS' | 'Support',
                        addingManagerToGroup.groupNum
                      );
                    }
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{row.employee.user.name}</div>
                      <div className="text-xs text-gray-500">Level {row.employee.user.grade} - {row.employee.employee_type}</div>
                      <div className="mt-1 flex items-center gap-2">
                        {isUngrouped ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                            Belum Punya Grup
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                            Grup Saat Ini: {currentGroup}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-lg text-green-500">+</span>
                  </div>
                </button>
                );
              })}
            </div>
            
            {filteredDialogCandidates.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                {normalizedAddGroupSearch
                  ? `Tidak ada hasil untuk "${addGroupSearch.trim()}"`
                  : addingManagerToGroup.type === 'Manager Teknik'
                    ? 'Tidak ada karyawan level 13-14 yang tersedia untuk ditambahkan sebagai manager'
                    : `Tidak ada karyawan ${addingManagerToGroup.type} yang tersedia untuk dipindahkan ke grup ini`}
              </div>
            )}
            
            <button
              onClick={() => setAddingManagerToGroup(null)}
              className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Remove + Reassign Dialog */}
      {pendingRemovalReassign && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Pilih Grup Tujuan</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {pendingRemovalReassign.sourceType === 'Manager Teknik'
                    ? `Manager ${pendingRemovalReassign.employeeName} akan dihapus dari Manager Teknik lalu dipindah ke grup ${pendingRemovalReassign.employeeType}.`
                    : `${pendingRemovalReassign.employeeName} akan dipindah dari Grup ${pendingRemovalReassign.currentGroup} ke grup ${pendingRemovalReassign.employeeType} yang dipilih.`}
                </p>
                {pendingRemovalReassign.sourceType !== 'Manager Teknik' && (pendingRemovalReassign.employeeGrade === 13 || pendingRemovalReassign.employeeGrade === 14) && (
                  <p className="text-xs text-blue-700 mt-2">
                    Untuk level 13-14, tujuan tersedia: Manager Teknik atau Grup 1-5.
                  </p>
                )}
              </div>
              <button
                onClick={() => setPendingRemovalReassign(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ├ù
              </button>
            </div>

            <div className="space-y-2">
              {pendingRemovalReassign.availableDestinations.map((destination, index) => (
                <button
                  key={destination.kind === 'manager' ? 'destination-manager' : `destination-group-${destination.groupNumber}-${index}`}
                  onClick={() => handleConfirmRemovalReassign(destination)}
                  className="w-full px-4 py-3 text-left rounded-lg border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  {destination.kind === 'manager' ? (
                    <>
                      <div className="text-sm font-semibold text-gray-900">Manager Teknik</div>
                      <div className="text-xs text-gray-500 mt-0.5">Pindahkan karyawan ini menjadi Manager Teknik</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-gray-900">Grup {destination.groupNumber}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Pindahkan {pendingRemovalReassign.employeeType} ke grup ini</div>
                    </>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPendingRemovalReassign(null)}
              className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Legend - Shift Types */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-4 text-center">Keterangan Shift & Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shift Legend */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-emerald-600 rounded"></div>
              Shift Kerja
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-blue-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">
                  Pagi
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">Pagi</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">07:00 - 13:00 / 07:00 - 15:00</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-orange-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">
                  Siang
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">Siang</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">13:00 - 19:00 / 15:00 - 23:00</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-emerald-600 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">
                  Malam
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">Malam</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">19:00 - 07:00 / 23:00 - 07:00</div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Legend */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-red-400 rounded"></div>
              Status Karyawan
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-red-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">L</div>
                <span className="text-gray-700">Libur</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-yellow-400 text-gray-900 shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">CK</div>
                <span className="text-gray-700">Cuti Kepentingan</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-yellow-400 text-gray-900 shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">CS</div>
                <span className="text-gray-700">Cuti Sakit</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-yellow-400 text-gray-900 shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">TPO</div>
                <span className="text-gray-700">TPO (Malang / Dhoho / Sumenep)</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-yellow-400 text-gray-900 shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">OH</div>
                <span className="text-gray-700">Office Hour (08:00 - 17:00)</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-yellow-400 text-gray-900 shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">SC</div>
                <span className="text-gray-700">Standby On Call</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-yellow-400 text-gray-900 shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">-</div>
                <span className="text-gray-700">Lepas Dinas Malam</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-yellow-400 text-gray-900 shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">TB</div>
                <span className="text-gray-700">Tugas Belajar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RosteredStaffPersonView;
