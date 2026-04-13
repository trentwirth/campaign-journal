<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useNotesStore } from '@/stores/notes';
import { openDirectoryDialog } from '@/utils/fileSystem';
import type { CalendarMonth } from '@/types';
import { DEFAULT_CALENDAR } from '@/types';

const settingsStore = useSettingsStore();
const notesStore = useNotesStore();

const cal = computed(() => settingsStore.settings.calendar);

// Editable local copies
const calName = ref(cal.value.name);
const yearSuffix = ref(cal.value.yearSuffix);
const currentYear = ref(cal.value.currentYear);
const currentMonth = ref(cal.value.currentMonth);
const currentDay = ref(cal.value.currentDay);
const daysPerWeek = ref(cal.value.daysPerWeek);
const weekDayNames = ref(cal.value.weekDayNames.join(', '));
const months = ref<CalendarMonth[]>(cal.value.months.map((m) => ({ ...m })));

const saved = ref(false);

function addMonth() {
  months.value.push({ name: `Month ${months.value.length + 1}`, days: 28 });
}
function removeMonth(i: number) {
  if (months.value.length > 1) months.value.splice(i, 1);
}

async function browseDirectory() {
  const dir = await openDirectoryDialog();
  if (dir) {
    settingsStore.setNotesDirectory(dir);
    await notesStore.loadNotes();
  }
}

async function saveCalendar() {
  const parsedWeekDayNames = weekDayNames.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  settingsStore.updateCalendar({
    name: calName.value,
    yearSuffix: yearSuffix.value,
    currentYear: Number(currentYear.value),
    currentMonth: Number(currentMonth.value),
    currentDay: Number(currentDay.value),
    daysPerWeek: Number(daysPerWeek.value),
    weekDayNames: parsedWeekDayNames,
    months: months.value.map((m) => ({ name: m.name, days: Number(m.days) })),
  });

  saved.value = true;
  setTimeout(() => (saved.value = false), 2000);
}

function resetToEberron() {
  const d = DEFAULT_CALENDAR;
  calName.value = d.name;
  yearSuffix.value = d.yearSuffix;
  currentYear.value = d.currentYear;
  currentMonth.value = d.currentMonth;
  currentDay.value = d.currentDay;
  daysPerWeek.value = d.daysPerWeek;
  weekDayNames.value = d.weekDayNames.join(', ');
  months.value = d.months.map((m) => ({ ...m }));
}

const datePreview = computed(() => {
  const m = months.value[currentMonth.value - 1];
  if (!m) return `${currentYear.value} ${yearSuffix.value}`;
  return `${currentDay.value} ${m.name}, ${currentYear.value} ${yearSuffix.value}`;
});
</script>

<template>
  <div class="settings-view">
    <div class="settings-inner">
      <h2 class="settings-heading">Settings</h2>

      <!-- Notes Directory -->
      <section class="settings-section">
        <h3 class="section-title">Notes Directory</h3>
        <p class="section-desc">Where your <code>.md</code> note files are stored.</p>
        <div class="dir-row">
          <input
            type="text"
            class="dir-input"
            :value="settingsStore.settings.notesDirectory"
            readonly
            placeholder="No directory selected"
          />
          <button class="btn" @click="browseDirectory">Browse…</button>
        </div>
      </section>

      <!-- Calendar -->
      <section class="settings-section">
        <div class="section-header">
          <h3 class="section-title">Calendar</h3>
          <button class="btn btn-sm btn-ghost" @click="resetToEberron" title="Reset to Eberron Galifar Calendar">
            Reset to Eberron defaults
          </button>
        </div>
        <p class="section-desc">
          Configure your campaign calendar. Date tags in notes use the format
          <code>#{{ currentYear }}-MM-DD</code>.
        </p>

        <div class="form-grid">
          <label class="form-label">Calendar Name</label>
          <input v-model="calName" type="text" class="form-input" />

          <label class="form-label">Year Suffix</label>
          <input v-model="yearSuffix" type="text" class="form-input" placeholder="e.g. YK, CE, DR" />

          <label class="form-label">Days per Week</label>
          <input v-model.number="daysPerWeek" type="number" class="form-input" min="1" max="14" />

          <label class="form-label">Weekday Names</label>
          <input v-model="weekDayNames" type="text" class="form-input" placeholder="Comma-separated, e.g. Sul, Mol, Zol…" />
        </div>

        <!-- Current In-Game Date -->
        <div class="subsection">
          <h4 class="subsection-title">Current In-Game Date</h4>
          <p class="section-desc">Used as the "today" marker on the calendar and timeline.</p>
          <div class="date-row">
            <div class="date-field">
              <label class="form-label">Year</label>
              <input v-model.number="currentYear" type="number" class="form-input date-input" />
            </div>
            <div class="date-field">
              <label class="form-label">Month</label>
              <select v-model.number="currentMonth" class="form-input date-input">
                <option v-for="(m, i) in months" :key="m.name" :value="i + 1">{{ i + 1 }} – {{ m.name }}</option>
              </select>
            </div>
            <div class="date-field">
              <label class="form-label">Day</label>
              <input v-model.number="currentDay" type="number" class="form-input date-input" min="1" :max="months[currentMonth - 1]?.days ?? 28" />
            </div>
          </div>
          <div class="date-preview">
            <span class="date-preview-label">Preview:</span>
            <code class="date-preview-val">{{ datePreview }}</code>
          </div>
        </div>

        <!-- Months -->
        <div class="subsection">
          <div class="subsection-header">
            <h4 class="subsection-title">Months</h4>
            <button class="btn btn-sm" @click="addMonth">＋ Add Month</button>
          </div>
          <div class="months-table">
            <div class="months-table-head">
              <span>#</span>
              <span>Name</span>
              <span>Days</span>
              <span></span>
            </div>
            <div v-for="(month, i) in months" :key="i" class="months-table-row">
              <span class="month-idx">{{ i + 1 }}</span>
              <input v-model="month.name" type="text" class="form-input month-name-input" />
              <input v-model.number="month.days" type="number" class="form-input month-days-input" min="1" max="365" />
              <button class="btn-icon btn-danger btn-sm" @click="removeMonth(i)" :disabled="months.length <= 1" title="Remove month">✕</button>
            </div>
          </div>
        </div>

        <div class="save-row">
          <button class="btn btn-primary" @click="saveCalendar">
            {{ saved ? '✓ Saved!' : 'Save Calendar Settings' }}
          </button>
        </div>
      </section>

      <!-- Usage guide -->
      <section class="settings-section">
        <h3 class="section-title">Date Tag Format</h3>
        <p class="section-desc">
          Add a date tag anywhere in a note to link it to the Calendar and Timeline.
        </p>
        <div class="guide-block">
          <div class="guide-row">
            <code class="guide-tag">#{{ currentYear }}-01-15</code>
            <span class="guide-desc">Links note to day 15 of month 1 in year {{ currentYear }} {{ yearSuffix }}</span>
          </div>
          <div class="guide-row">
            <code class="guide-tag">#{{ currentYear }}-MM-DD</code>
            <span class="guide-desc">Placeholder inserted in every new note – replace MM and DD</span>
          </div>
        </div>
        <div class="guide-block" style="margin-top: 12px">
          <p class="section-desc">Add a priority to control timeline visibility (in note frontmatter):</p>
          <pre class="guide-pre">---
priority: 5
---</pre>
          <div class="priority-guide">
            <span v-for="p in [1,2,3,4,5]" :key="p" class="priority-row">
              <span class="prio-num">{{ p }}</span>
              <span class="prio-label">{{ ['Minor','Low','Normal','Important','Milestone'][p-1] }}</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  height: 100%;
  overflow-y: auto;
  background: var(--bg);
}
.settings-inner {
  max-width: 700px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}
.settings-heading {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 28px;
}

.settings-section {
  margin-bottom: 36px;
  padding-bottom: 36px;
  border-bottom: 1px solid var(--border);
}
.settings-section:last-child { border-bottom: none; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
}
.section-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 14px;
  line-height: 1.5;
}

.dir-row { display: flex; gap: 8px; align-items: center; }
.dir-input { flex: 1; font-family: var(--font-mono); font-size: 12px; }

.form-grid {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 10px 16px;
  align-items: center;
  margin-bottom: 20px;
}
.form-label { font-size: 13px; color: var(--text-subtle); font-weight: 500; }
.form-input { width: 100%; }

.subsection { margin-top: 20px; }
.subsection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.subsection-title { font-size: 14px; font-weight: 600; color: var(--text); }

.date-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.date-field { display: flex; flex-direction: column; gap: 4px; }
.date-input { width: 120px; }

.date-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
}
.date-preview-label { }
.date-preview-val { color: var(--accent); font-size: 13px; }

.months-table { display: flex; flex-direction: column; gap: 6px; }
.months-table-head {
  display: grid;
  grid-template-columns: 28px 1fr 80px 28px;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 0 2px;
}
.months-table-row {
  display: grid;
  grid-template-columns: 28px 1fr 80px 28px;
  gap: 8px;
  align-items: center;
}
.month-idx { font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); text-align: center; }
.month-name-input { }
.month-days-input { }

.save-row { margin-top: 20px; }

/* Guide */
.guide-block {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
}
.guide-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.guide-row:last-child { margin-bottom: 0; }
.guide-tag {
  font-size: 13px;
  color: var(--accent);
  background: var(--accent-glow);
  border: 1px solid var(--accent-dim);
  border-radius: 4px;
  padding: 2px 8px;
  flex-shrink: 0;
}
.guide-desc { font-size: 12px; color: var(--text-muted); }
.guide-pre {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
  font-size: 12px;
  color: var(--teal);
  margin: 10px 0 8px;
}
.priority-guide { display: flex; gap: 16px; flex-wrap: wrap; }
.priority-row { display: flex; align-items: center; gap: 5px; }
.prio-num {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent);
  width: 16px;
  text-align: center;
}
.prio-label { font-size: 12px; color: var(--text-muted); }
</style>
