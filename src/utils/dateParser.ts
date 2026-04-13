import type { NoteDate, CalendarConfig } from '@/types';

// Matches #YYYY-MM-DD or #YYY-MM-DD anywhere in text
const DATE_TAG_REGEX = /#(\d{1,4})-(\d{1,2})-(\d{1,2})/g;
const DATE_TAG_SINGLE = /#(\d{1,4})-(\d{1,2})-(\d{1,2})/;

export function parseDateTags(content: string): NoteDate[] {
  const dates: NoteDate[] = [];
  const matches = content.matchAll(DATE_TAG_REGEX);
  for (const match of matches) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month >= 1 && day >= 1) {
      dates.push({ year, month, day });
    }
  }
  return dates;
}

export function parsePrimaryDate(content: string): NoteDate | undefined {
  const match = content.match(DATE_TAG_SINGLE);
  if (!match) return undefined;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || day < 1) return undefined;
  return { year, month, day };
}

export function parsePriority(content: string): 1 | 2 | 3 | 4 | 5 {
  const match = content.match(/^---\s*\n(?:.*\n)*?priority:\s*([1-5])/m);
  if (match) {
    return parseInt(match[1], 10) as 1 | 2 | 3 | 4 | 5;
  }
  return 3;
}

export function formatDateTag(date: NoteDate): string {
  const mm = String(date.month).padStart(2, '0');
  const dd = String(date.day).padStart(2, '0');
  return `#${date.year}-${mm}-${dd}`;
}

/** Convert a NoteDate to a linear day number for timeline positioning */
export function dateToDayNumber(date: NoteDate, calendar: CalendarConfig): number {
  // Sum days in full years
  const totalDaysPerYear = calendar.months.reduce((s, m) => s + m.days, 0);
  let dayNumber = (date.year - 1) * totalDaysPerYear;

  // Add days for each completed month
  for (let m = 1; m < date.month; m++) {
    const monthDef = calendar.months[m - 1];
    dayNumber += monthDef ? monthDef.days : 0;
  }

  dayNumber += date.day;
  return dayNumber;
}

export function dateToLabel(date: NoteDate, calendar: CalendarConfig): string {
  const month = calendar.months[date.month - 1];
  const monthName = month ? month.name : `Month ${date.month}`;
  return `${date.day} ${monthName}, ${date.year} ${calendar.yearSuffix}`;
}

export function newNoteTemplate(calendar: CalendarConfig): string {
  const year = calendar.currentYear;
  return `#${year}-MM-DD\n\n# New Note\n\n`;
}
