/**
 * RosteredStaffPersonView Component
 * 
 * Shows roster in a person-by-person format
 * Each row represents one employee with all their shift assignments for the month
 */

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RosterPeriod, Shift, Employee, ShiftAssignment } from '../types/roster';
import { useAuth } from '../../auth/core/AuthContext';
import { rosterService } from '../repository/rosterService';
import { useDataCache } from '../../../contexts/DataCacheContext';

interface RosteredStaffPersonViewProps {
  roster: RosterPeriod;
  shifts: Shift[];
}

type EmployeeRosterRow = {
  employee: Employee;
  assignmentsByDay: Map<number, ShiftAssignment>; // day number -> assignment
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
  const [optimisticAssignments, setOptimisticAssignments] = useState<Record<string, ShiftAssignment>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Check if user can edit (Admin or Manager Teknik)
  const canEdit = user?.role === 'Admin' || user?.role === 'Manager Teknik';

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
    if (!canEdit) return;
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
    if (!canEdit) return;
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

    // Update optimistically - group by date
    const cellsByDate: Record<string, Array<{ day: number; patternValue: string }>> = {};
    patternCells.forEach(pc => {
      const dateStr = `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(pc.day).padStart(2, '0')}`;
      if (!cellsByDate[dateStr]) {
        cellsByDate[dateStr] = [];
      }
      cellsByDate[dateStr].push({ day: pc.day, patternValue: pc.patternValue });
    });

    let updatedRoster = { ...roster };

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
    
    if (!selectedEmployee || !selectedEmployee.group_number) {
      return [employeeId]; // If no group, return only this employee
    }

    const sameGroupEmployees: number[] = [];
    allEmployees.forEach((employee, id) => {
      if (employee.employee_type === selectedEmployee.employee_type && 
          employee.group_number === selectedEmployee.group_number) {
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
    
    let updatedRoster = { ...roster };
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

    let updatedRoster = { ...roster };

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
    
    let updatedRoster = { ...roster };
    
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

  const handleShiftChange = async (employeeId: number, day: number, optionValue: string, customNote?: string) => {
    const option = shiftOptions.find(o => o.value === optionValue);
    if (!option || !option.shiftId) {
      console.error('Option not found or missing shiftId:', optionValue, option);
      return;
    }

    // Find the roster day
    const dateStr = `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const rosterDay = roster.roster_days?.find(d => d.work_date === dateStr);
    
    if (!rosterDay) {
      console.error('Roster day not found');
      return;
    }

    // Find existing assignment to get employee data
    const existingAssignment = rosterDay.shift_assignments?.find(a => a.employee_id === employeeId);
    
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
      employee: existingAssignment?.employee || {} as any,
      shift: selectedShift,
    };

    const affectedCells = [{ employeeId, day }];
    setOptimisticAssignments((prev) => ({
      ...prev,
      [getCellKey(employeeId, day)]: optimisticAssignment as ShiftAssignment,
    }));

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

        const finalRosterDays = roster.roster_days?.map(d => 
          d.id === rosterDay.id ? finalRosterDay : d
        );

        updateRosterDetail(roster.id, {
          ...roster,
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
    if (name.includes('morning') || name.includes('pagi') || name.includes('shift 1')) return 'bg-blue-500 text-white font-semibold';
    if (name.includes('afternoon') || name.includes('siang') || name.includes('shift 2')) return 'bg-orange-500 text-white font-semibold';
    if (name.includes('night') || name.includes('malam') || name.includes('shift 3')) return 'bg-emerald-600 text-white font-semibold';
    return 'bg-gray-600 text-white font-semibold';
  };

  const getNotesClasses = (notes: string) => {
    const note = notes.toLowerCase().trim();
    
    // Shift reguler dengan warna kontras tinggi
    if (note === 'pagi' || note === 'p') return 'bg-blue-500 text-white font-semibold';
    if (note === 'siang' || note === 's') return 'bg-orange-500 text-white font-semibold';
    if (note === 'malam' || note === 'm') return 'bg-emerald-600 text-white font-semibold';
    
    // Status karyawan dengan warna yang lebih kontras dan mudah dibedakan
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
    
    // Partial matches - Gunakan warna yang sama dengan exact match
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
    
    // Default untuk custom notes lainnya - Warna yang sangat menonjol
    return 'bg-lime-500 text-gray-900 font-semibold';
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
  const displayedDays = weeks[currentWeek] || [];

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

    return Array.from(employeeRowsMap.values()).sort((a, b) =>
      a.employee.user.name.localeCompare(b.employee.user.name)
    );
  };

  const employeeRows = getEmployeeRows();

  // Group employees by employee_type and group_number from backend
  const allGroupedData = (() => {
    // Separate by employee type
    const typeGroups = new Map<string, Map<number, EmployeeRosterRow[]>>();
    
    employeeRows.forEach(row => {
      const type = row.employee.employee_type;
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
      
      const sortedGroups = Array.from(groupMap.entries())
        .sort((a, b) => a[0] - b[0]) // Sort by group number
        .filter(([groupNum]) => groupNum > 0); // Only show groups with actual group numbers
      
      if (sortedGroups.length > 0) {
        result.push({
          type: orderedType,
          groups: sortedGroups.map(([_, employees]) => employees),
          groupNumbers: sortedGroups.map(([groupNum, _]) => groupNum)
        });
      }
    });

    return result;
  })();

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
    const firstDay = displayedDays[0];
    const lastDay = displayedDays[displayedDays.length - 1];
    return `${firstDay} - ${lastDay} ${getMonthName(roster.month)}`;
  };

  // Get unique Manager Teknik from roster
  const getManagerTeknik = () => {
    const managers = new Set<string>();
    roster.roster_days?.forEach(day => {
      day.manager_duties?.forEach(duty => {
        if (duty.duty_type === 'Manager Teknik') {
          managers.add(duty.employee.user.name);
        }
      });
    });
    return Array.from(managers);
  };

  const managerTeknikList = getManagerTeknik();

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 -mx-4 sm:mx-0 p-4 sm:p-6 lg:p-8">
      {/* Manager Info Box - Top Right */}
      {managerTeknikList.length > 0 && (
        <div className="float-right ml-4 mb-4 p-3 sm:p-4 bg-white border-2 border-black rounded text-center min-w-[150px] sm:min-w-[180px]">
          <div className="text-[10px] sm:text-xs font-bold text-black mb-2">Dibuat,</div>
          <div className="text-[10px] sm:text-xs font-bold text-black uppercase leading-tight mb-3">
            MANAGER TEKNIK {managerTeknikList.length}
          </div>
          <div className="pt-3 border-t-2 border-black">
            {managerTeknikList.map((manager, idx) => (
              <div key={idx} className="text-[10px] sm:text-xs font-bold text-black uppercase mb-1 last:mb-0">
                {manager}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-6 gap-2">
        <button
          onClick={handlePrevWeek}
          disabled={currentWeek === 0}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
            currentWeek === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="text-center flex-1 min-w-0">
          <h2 className="text-lg sm:text-3xl font-bold text-gray-900">Rostered Staff</h2>
          <p className="text-xs sm:text-lg text-gray-500 truncate">
            {getWeekDateRange()} {roster.year}
          </p>
          <p className="text-[10px] sm:text-lg text-gray-400 mt-1">
            Week {currentWeek + 1} of {totalWeeks}
          </p>
        </div>

        <button
          onClick={handleNextWeek}
          disabled={currentWeek === totalWeeks - 1}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
            currentWeek === totalWeeks - 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Week Navigation Pills */}
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

      {/* Clear float from manager info box */}
      <div className="clear-both"></div>

      {/* Roster Table - Person View */}
      <div 
        ref={tableContainerRef}
        className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 relative"
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-3 sm:px-4 py-2 sm:py-3 rounded-tl-xl whitespace-nowrap sticky left-0 z-10" style={{ backgroundColor: '#222E6A' }}>
                Name
              </th>
              <th className="text-center text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap" style={{ backgroundColor: '#222E6A' }}>
                Kelas
              </th>
              <th className="text-center text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap" style={{ backgroundColor: '#222E6A' }}>
                Jabatan
              </th>
              {displayedDays.map((day) => (
                <th key={day} className="text-center text-[10px] sm:text-xs lg:text-sm font-semibold text-white px-2 sm:px-3 py-2 sm:py-3" style={{ backgroundColor: '#222E6A' }}>
                  <div className="text-[9px] sm:text-[10px] text-white/70">{getDayName(roster.year, roster.month, day)}</div>
                  <div className="font-bold">{day}</div>
                </th>
              ))}
              <th className="w-6 sm:w-12 rounded-tr-xl" style={{ backgroundColor: '#222E6A' }}></th>
            </tr>
          </thead>
          <tbody>
            {allGroupedData.length === 0 ? (
              <tr>
                <td colSpan={displayedDays.length + 4} className="text-center py-12 text-gray-500">
                  No staff assigned for this week
                </td>
              </tr>
            ) : (
              allGroupedData.map((typeGroup, typeIndex) => (
                <React.Fragment key={`type-${typeGroup.type}`}>
                  {/* Employee Type Header */}
                  <tr>
                    <td 
                      colSpan={displayedDays.length + 4}
                      className="px-3 sm:px-4 py-3 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-[#222E6A] to-[#2a3a7f] border-y-2 border-[#1a235c]"
                    >
                      {typeGroup.type}
                    </td>
                  </tr>
                  
                  {/* Groups within this type */}
                  {typeGroup.groups.map((group, groupIndex) => {
                    const actualGroupNumber = typeGroup.groupNumbers[groupIndex];
                    
                    return (
                      <React.Fragment key={`${typeGroup.type}-${groupIndex}`}>
                        {/* Group Header Row */}
                        <tr>
                          <td 
                            colSpan={displayedDays.length + 4}
                            className="px-3 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-gray-800 bg-gradient-to-r from-orange-200 to-orange-100 border-y border-orange-300"
                          >
                            Grup {actualGroupNumber}
                          </td>
                        </tr>
                      
                      {/* Employee Rows in Group */}
                      {group.map((row, rowIndexInGroup) => {
                        const isLastRowInGroup = rowIndexInGroup === group.length - 1;
                        const isLastGroup = typeIndex === allGroupedData.length - 1 && groupIndex === typeGroup.groups.length - 1;
                        
                        return (
                          <tr key={row.employee.id} className="hover:bg-gray-50 transition-colors">
                            <td className={`px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 sticky left-0 bg-white ${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-normal">{rowIndexInGroup + 1}</span>
                                <span className="whitespace-nowrap">{row.employee.user.name}</span>
                              </div>
                            </td>
                            <td className={`px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs lg:text-sm text-gray-700 ${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''}`}>
                              {row.employee.user.grade || '-'}
                            </td>
                            <td className={`px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs lg:text-sm text-gray-700 ${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''}`}>
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
                                          ? getNotesClasses(assignment.notes!) + ' shadow-sm hover:shadow-md cursor-pointer'
                                          : (shift ? getShiftClasses(shift.name) + ' shadow-sm hover:shadow-md cursor-pointer' : 'bg-gray-100')
                                        )
                                      : 'bg-gray-100');
                                
                                const isEditing = editingCell?.employeeId === row.employee.id && editingCell?.day === day;
                                
                                cells.push(
                                  <td 
                                    key={`${row.employee.id}-${day}`} 
                                    colSpan={colSpan}
                                    className={`px-1 sm:px-2 py-2 sm:py-3 ${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''} relative`}
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
                                      className={`h-8 sm:h-10 w-full rounded-lg flex items-center justify-center text-[9px] sm:text-xs font-semibold transition-all ${cellClasses} ${canEdit && !isEditing ? 'cursor-pointer hover:ring-2 hover:ring-[#222E6A] hover:ring-offset-1' : ''} relative group select-none`}
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
      {selectedCells.length > 0 && toolbarPosition && !isSelecting && (
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
                        onChange={(e) => setApplyToGroup(e.target.checked)}
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
                <div className="w-16 h-7 rounded-lg bg-slate-400 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">L</div>
                <span className="text-gray-700">Libur</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-amber-400 text-gray-900 shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">CT</div>
                <span className="text-gray-700">Cuti Tahunan</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-rose-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">CS</div>
                <span className="text-gray-700">Cuti Sakit / Cuti Dokter</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-teal-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">DL</div>
                <span className="text-gray-700">Dinas Luar</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-cyan-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">OH</div>
                <span className="text-gray-700">Office Hour (08:00 - 17:00)</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-purple-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">SC</div>
                <span className="text-gray-700">Standby On Call</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-gray-600 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">-</div>
                <span className="text-gray-700">Lepas Dinas Malam</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-indigo-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">TB</div>
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