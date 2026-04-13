<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useNotesStore } from '@/stores/notes';
import type { Note } from '@/types';
import { dateToLabel } from '@/utils/dateParser';

const settingsStore = useSettingsStore();
const notesStore = useNotesStore();

const cal = computed(() => settingsStore.settings.calendar);

// Current view: year and month
const viewYear = ref(cal.value.currentYear);
const viewMonth = ref(cal.value.currentMonth); // 1-indexed

const monthDef = computed(() => cal.value.months[viewMonth.value - 1]);
const monthName = computed(() => monthDef.value?.name ?? `Month ${viewMonth.value}`);
const daysInMonth = computed(() => monthDef.value?.days ?? 28);

// Days per week and names
const dpw = computed(() => cal.value.daysPerWeek);
const weekNames = computed(() => cal.value.weekDayNames);

// Build calendar grid
// Day 1 of every month starts on week-day index 0 (Sul) for simplicity,
// but we compute the actual start offset using cumulative day counts.
const startOffset = computed(() => {
  // Count total days before this month in this year
  let daysBefore = 0;
  for (let m = 1; m < viewMonth.value; m++) {
    daysBefore += cal.value.months[m - 1]?.days ?? 0;
  }
  // Year offset: total days in all prior years
  const totalDaysPerYear = cal.value.months.reduce((s, m) => s + m.days, 0);
  const yearDays = (viewYear.value - 1) * totalDaysPerYear;
  return (yearDays + daysBefore) % dpw.value;
});

interface CalCell {
  day: number | null;
  notes: Note[];
  isCurrentDay: boolean;
}

const grid = computed((): CalCell[] => {
  const cells: CalCell[] = [];
  const offset = startOffset.value;
  // Leading empty cells
  for (let i = 0; i < offset; i++) cells.push({ day: null, notes: [], isCurrentDay: false });

  for (let d = 1; d <= daysInMonth.value; d++) {
    const dayNotes = notesStore.notesWithDates.filter(
      (n) =>
        n.date!.year === viewYear.value &&
        n.date!.month === viewMonth.value &&
        n.date!.day === d,
    );
    const isCurrent =
      viewYear.value === cal.value.currentYear &&
      viewMonth.value === cal.value.currentMonth &&
      d === cal.value.currentDay;
    cells.push({ day: d, notes: dayNotes, isCurrentDay: isCurrent });
  }
  return cells;
});

// Weeks array for rendering
const weeks = computed(() => {
  const rows: CalCell[][] = [];
  const g = grid.value;
  for (let i = 0; i < g.length; i += dpw.value) {
    const row = g.slice(i, i + dpw.value);
    while (row.length < dpw.value) row.push({ day: null, notes: [], isCurrentDay: false });
    rows.push(row);
  }
  return rows;
});

function prevMonth() {
  if (viewMonth.value === 1) {
    viewMonth.value = cal.value.months.length;
    viewYear.value--;
  } else {
    viewMonth.value--;
  }
}
function nextMonth() {
  if (viewMonth.value === cal.value.months.length) {
    viewMonth.value = 1;
    viewYear.value++;
  } else {
    viewMonth.value++;
  }
}
function goToCurrentDate() {
  viewYear.value = cal.value.currentYear;
  viewMonth.value = cal.value.currentMonth;
}

const selectedDay = ref<number | null>(null);
const dayNotes = computed(() =>
  selectedDay.value !== null
    ? notesStore.notesWithDates.filter(
        (n) =>
          n.date!.year === viewYear.value &&
          n.date!.month === viewMonth.value &&
          n.date!.day === selectedDay.value,
      )
    : [],
);

function selectDay(day: number | null) {
  if (!day) return;
  selectedDay.value = selectedDay.value === day ? null : day;
}

function openNote(id: string) {
  notesStore.setActiveNote(id);
  // Emit to parent to switch tab (workaround: use a global event)
  window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'journal' }));
}

function priorityLabel(p: number) {
  return ['', 'Minor', 'Low', 'Normal', 'Important', 'Milestone'][p] ?? '';
}

// ── In-game "today" controls ──────────────────────────────────
const editingToday = ref(false);
const editDayRef = ref<HTMLInputElement | null>(null);
const editYear = ref(cal.value.currentYear);
const editMonth = ref(cal.value.currentMonth);
const editDay = ref(cal.value.currentDay);

const todayLabel = computed(() => {
  const m = cal.value.months[cal.value.currentMonth - 1];
  return `${cal.value.currentDay} ${m?.name ?? ''}, ${cal.value.currentYear} ${cal.value.yearSuffix}`;
});

function startEditToday() {
  editYear.value = cal.value.currentYear;
  editMonth.value = cal.value.currentMonth;
  editDay.value = cal.value.currentDay;
  editingToday.value = true;
  nextTick(() => editDayRef.value?.select());
}

function confirmEditToday() {
  const maxDay = cal.value.months[editMonth.value - 1]?.days ?? 28;
  settingsStore.updateCalendar({
    currentYear: Math.max(1, editYear.value),
    currentMonth: editMonth.value,
    currentDay: Math.min(Math.max(1, editDay.value), maxDay),
  });
  editingToday.value = false;
  // Navigate view to the new date
  viewYear.value = settingsStore.settings.calendar.currentYear;
  viewMonth.value = settingsStore.settings.calendar.currentMonth;
}

function cancelEditToday() {
  editingToday.value = false;
}

function prevDay() {
  let { currentYear: y, currentMonth: mo, currentDay: d } = cal.value;
  d--;
  if (d < 1) {
    mo--;
    if (mo < 1) { mo = cal.value.months.length; y--; }
    d = cal.value.months[mo - 1]?.days ?? 28;
  }
  settingsStore.updateCalendar({ currentYear: y, currentMonth: mo, currentDay: d });
  viewYear.value = y;
  viewMonth.value = mo;
}

function nextDay() {
  let { currentYear: y, currentMonth: mo, currentDay: d } = cal.value;
  const maxDay = cal.value.months[mo - 1]?.days ?? 28;
  d++;
  if (d > maxDay) {
    d = 1;
    mo++;
    if (mo > cal.value.months.length) { mo = 1; y++; }
  }
  settingsStore.updateCalendar({ currentYear: y, currentMonth: mo, currentDay: d });
  viewYear.value = y;
  viewMonth.value = mo;
}
</script>

<template>
  <div class="calendar-view">
    <!-- Header -->
    <div class="cal-header">
      <!-- Month navigation -->
      <div class="cal-nav">
        <button class="btn btn-ghost btn-sm" @click="prevMonth">‹ Prev</button>
        <div class="cal-title">
          <span class="cal-month">{{ monthName }}</span>
          <span class="cal-year">{{ viewYear }} {{ cal.yearSuffix }}</span>
        </div>
        <button class="btn btn-ghost btn-sm" @click="nextMonth">Next ›</button>
      </div>

      <!-- In-game date control -->
      <div class="today-control">
        <span class="today-label">In-game date</span>
        <div v-if="!editingToday" class="today-display">
          <button class="today-arrow" @click="prevDay" title="Previous day">‹</button>
          <span class="today-date" @click="startEditToday" title="Click to edit date">{{ todayLabel }}</span>
          <button class="today-arrow" @click="nextDay" title="Next day">›</button>
        </div>
        <div v-else class="today-edit">
          <input
            ref="editDayRef"
            v-model.number="editDay"
            type="number"
            class="today-input today-day"
            min="1"
            :max="cal.months[editMonth - 1]?.days ?? 28"
            @keydown.enter="confirmEditToday"
            @keydown.escape="cancelEditToday"
          />
          <select
            v-model.number="editMonth"
            class="today-input today-month"
            @keydown.enter="confirmEditToday"
            @keydown.escape="cancelEditToday"
          >
            <option v-for="(m, i) in cal.months" :key="m.name" :value="i + 1">{{ m.name }}</option>
          </select>
          <input
            v-model.number="editYear"
            type="number"
            class="today-input today-year"
            @keydown.enter="confirmEditToday"
            @keydown.escape="cancelEditToday"
          />
          <span class="today-suffix">{{ cal.yearSuffix }}</span>
          <button class="btn btn-sm btn-primary" @click="confirmEditToday">✓</button>
          <button class="btn btn-sm btn-ghost" @click="cancelEditToday">✕</button>
        </div>
      </div>

      <button class="btn btn-sm" @click="goToCurrentDate" title="Jump view to current in-game date">Jump to Today</button>
    </div>

    <div class="cal-body">
      <!-- Calendar grid -->
      <div class="cal-grid-wrap">
        <!-- Weekday headers -->
        <div class="cal-weekdays">
          <div v-for="name in weekNames" :key="name" class="weekday-label">{{ name }}</div>
        </div>

        <!-- Weeks -->
        <div class="cal-weeks">
          <div v-for="(week, wi) in weeks" :key="wi" class="cal-week">
            <div
              v-for="(cell, ci) in week"
              :key="ci"
              class="cal-cell"
              :class="{
                empty: cell.day === null,
                'has-notes': cell.notes.length > 0,
                'is-today': cell.isCurrentDay,
                selected: cell.day === selectedDay,
              }"
              @click="selectDay(cell.day)"
            >
              <span v-if="cell.day" class="cell-day">{{ cell.day }}</span>
              <div v-if="cell.notes.length" class="cell-dots">
                <span
                  v-for="note in cell.notes.slice(0, 3)"
                  :key="note.id"
                  class="cell-dot"
                  :class="`priority-${note.priority}`"
                  :title="note.title"
                />
                <span v-if="cell.notes.length > 3" class="cell-more">+{{ cell.notes.length - 3 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Day detail panel -->
      <div class="day-panel" v-if="selectedDay !== null">
        <div class="day-panel-header">
          <span class="day-panel-title">
            {{ selectedDay }} {{ monthName }}, {{ viewYear }} {{ cal.yearSuffix }}
          </span>
          <button class="btn-icon" @click="selectedDay = null">✕</button>
        </div>
        <div v-if="dayNotes.length === 0" class="day-panel-empty">No notes on this day.</div>
        <ul v-else class="day-note-list">
          <li
            v-for="note in dayNotes"
            :key="note.id"
            class="day-note-item"
            @click="openNote(note.id)"
          >
            <span class="day-note-priority" :class="`priority-${note.priority}`" :title="priorityLabel(note.priority)" />
            <span class="day-note-title">{{ note.title }}</span>
            <span class="day-note-open">Open →</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Month list sidebar -->
    <div class="months-sidebar">
      <div class="months-label">Months</div>
      <button
        v-for="(m, i) in cal.months"
        :key="m.name"
        class="month-btn"
        :class="{ active: viewMonth === i + 1 }"
        @click="viewMonth = i + 1"
      >
        <span class="month-num">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="month-name">{{ m.name }}</span>
        <span class="month-days text-muted text-sm">{{ m.days }}d</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.calendar-view {
  display: grid;
  grid-template-columns: 1fr 160px;
  grid-template-rows: auto 1fr;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

/* Header */
.cal-header {
  grid-column: 1 / 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.cal-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cal-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 140px;
}
.cal-month { font-size: 18px; font-weight: 700; color: var(--text); }
.cal-year { font-size: 11px; color: var(--accent); font-family: var(--font-mono); }

/* In-game date control */
.today-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.today-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.today-display {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2px 4px;
}
.today-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--text-subtle);
  transition: background 0.12s, color 0.12s;
}
.today-arrow:hover { background: var(--bg-hover); color: var(--accent); }
.today-date {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  font-family: var(--font-mono);
  padding: 0 6px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.12s;
  white-space: nowrap;
}
.today-date:hover { background: var(--accent-glow); }
.today-edit {
  display: flex;
  align-items: center;
  gap: 4px;
}
.today-input {
  background: var(--bg);
  border: 1px solid var(--accent-dim);
  border-radius: 4px;
  color: var(--text);
  font-size: 12px;
  padding: 3px 5px;
  font-family: var(--font-mono);
}
.today-day  { width: 44px; text-align: center; }
.today-month { width: 100px; }
.today-year { width: 60px; text-align: center; }
.today-suffix { font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); }

/* Body */
.cal-body {
  grid-column: 1 / 2;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
  gap: 14px;
}

.cal-grid-wrap { flex-shrink: 0; }

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(v-bind('dpw'), 1fr);
  margin-bottom: 4px;
}
.weekday-label {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  padding: 4px 0;
}

.cal-weeks { display: flex; flex-direction: column; gap: 3px; }
.cal-week {
  display: grid;
  grid-template-columns: repeat(v-bind('dpw'), 1fr);
  gap: 3px;
}

.cal-cell {
  min-height: 64px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 5px 7px;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.cal-cell.empty { background: transparent; border-color: transparent; cursor: default; }
.cal-cell:not(.empty):hover { border-color: var(--accent-dim); background: var(--bg-elevated); }
.cal-cell.has-notes { border-color: var(--accent-dim); }
.cal-cell.is-today { border-color: var(--accent); background: var(--accent-glow); }
.cal-cell.selected { border-color: var(--accent); background: var(--accent-glow); box-shadow: 0 0 0 1px var(--accent); }

.cell-day {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-subtle);
}
.cal-cell.is-today .cell-day { color: var(--accent); }

.cell-dots { display: flex; gap: 3px; flex-wrap: wrap; align-items: center; }
.cell-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.cell-more { font-size: 9px; color: var(--text-muted); }

/* Day panel */
.day-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  flex-shrink: 0;
}
.day-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
}
.day-panel-title { font-size: 13px; font-weight: 600; color: var(--text); }
.day-panel-empty { padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px; }

.day-note-list { list-style: none; }
.day-note-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.12s;
}
.day-note-item:hover { background: var(--bg-elevated); }
.day-note-title { flex: 1; font-size: 13px; color: var(--text); }
.day-note-open { font-size: 11px; color: var(--accent); opacity: 0; transition: opacity 0.12s; }
.day-note-item:hover .day-note-open { opacity: 1; }

/* Months sidebar */
.months-sidebar {
  grid-row: 2;
  grid-column: 2;
  border-left: 1px solid var(--border);
  background: var(--bg-surface);
  overflow-y: auto;
  padding: 8px 0;
}
.months-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding: 4px 12px 8px;
}
.month-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-subtle);
  text-align: left;
  transition: background 0.12s, color 0.12s;
}
.month-btn:hover { background: var(--bg-elevated); color: var(--text); }
.month-btn.active { background: var(--accent-glow); color: var(--accent); }
.month-num { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); width: 18px; }
.month-name { flex: 1; font-weight: 500; }
.month-days { flex-shrink: 0; }

/* Priority dot colors */
.priority-1 { background: var(--text-muted); }
.priority-2 { background: var(--blue); }
.priority-3 { background: var(--green); }
.priority-4 { background: var(--yellow); }
.priority-5 { background: var(--accent); }

.day-note-priority {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
