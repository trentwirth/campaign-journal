export interface CalendarMonth {
  name: string;
  days: number;
}

export interface CalendarConfig {
  name: string;
  yearSuffix: string;
  currentYear: number;
  currentMonth: number; // 1-indexed
  currentDay: number;
  months: CalendarMonth[];
  daysPerWeek: number;
  weekDayNames: string[];
}

export interface NoteDate {
  year: number;
  month: number; // 1-indexed
  day: number;
}

// 1 = minor, 3 = normal, 5 = major milestone
export type NotePriority = 1 | 2 | 3 | 4 | 5;

export interface Note {
  id: string;
  title: string;
  content: string;
  filePath: string;
  date?: NoteDate;
  priority: NotePriority;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  notesDirectory: string;
  calendar: CalendarConfig;
}

export type AppTab = 'journal' | 'calendar' | 'timeline' | 'settings';

export const DEFAULT_CALENDAR: CalendarConfig = {
  name: 'Galifar Calendar',
  yearSuffix: 'YK',
  currentYear: 998,
  currentMonth: 1,
  currentDay: 1,
  months: [
    { name: 'Zarantyr', days: 28 },
    { name: 'Olarune', days: 28 },
    { name: 'Therendor', days: 28 },
    { name: 'Eyre', days: 28 },
    { name: 'Dravago', days: 28 },
    { name: 'Nymm', days: 28 },
    { name: 'Lharvion', days: 28 },
    { name: 'Barrakas', days: 28 },
    { name: 'Rhaan', days: 28 },
    { name: 'Sypheros', days: 28 },
    { name: 'Aryth', days: 28 },
    { name: 'Vult', days: 28 },
  ],
  daysPerWeek: 7,
  weekDayNames: ['Sul', 'Mol', 'Zol', 'Wir', 'Zor', 'Far', 'Sar'],
};

export const DEFAULT_SETTINGS: AppSettings = {
  notesDirectory: '',
  calendar: DEFAULT_CALENDAR,
};
