import type { Employee } from '../../types/roster';

export const managerTeknikDefaultGroupMap: Record<string, number> = {
  'Dudik Fahrudin Sukarno': 1,
  'Andi Wibowo': 2,
  'Efried Nara Perkasa': 3,
  'Alam Fahmi': 4,
  'Netty Septa Cristila': 5,
};

export const getManagerTeknikEffectiveGroup = (employee: Employee): number => {
  return managerTeknikDefaultGroupMap[employee.user.name] ?? employee.group_number ?? 0;
};
