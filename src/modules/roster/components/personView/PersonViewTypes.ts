/**
 * Types specific to Person View components
 */

import type { Employee, ShiftAssignment } from '../../types/roster';

export type EmployeeRosterRow = {
  employee: Employee;
  assignmentsByDay: Map<number, ShiftAssignment>; // day number -> assignment
};

export type SelectedCell = {
  employeeId: number;
  day: number;
};

export type EditingCell = {
  employeeId: number;
  day: number;
  mergedStart?: number;
  mergedEnd?: number;
} | null;

export type ShiftOption = {
  label: string;
  value: string;
  shiftId?: number;
  notes?: string;
};

export type ToolbarPosition = {
  top: number;
  left: number;
} | null;
