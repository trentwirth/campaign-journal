<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useNotesStore } from '@/stores/notes';
import { useSettingsStore } from '@/stores/settings';
import { dateToDayNumber, dateToLabel } from '@/utils/dateParser';
import type { Note } from '@/types';

const notesStore = useNotesStore();
const settingsStore = useSettingsStore();

const cal = computed(() => settingsStore.settings.calendar);

// Zoom: pixels per day
const MIN_ZOOM = 1;
const MAX_ZOOM = 60;
const zoom = ref(8); // px/day

const scrollLeft = ref(0);
const timelineEl = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const dragStart = ref(0);
const dragScrollStart = ref(0);

const hoveredNoteId = ref<string | null>(null);
const tooltipX = ref(0);
const tooltipY = ref(0);
const tooltipNote = ref<Note | null>(null);

// All notes that have dates, sorted by date
const datedNotes = computed(() =>
  [...notesStore.notesWithDates].sort((a, b) => {
    const da = dateToDayNumber(a.date!, cal.value);
    const db = dateToDayNumber(b.date!, cal.value);
    return da - db;
  }),
);

// Day range to display (add padding)
const { minDay, maxDay, totalSpan } = (() => ({
  minDay: 0,
  maxDay: 0,
  totalSpan: 0,
})) as unknown as { minDay: number; maxDay: number; totalSpan: number };

const timelineRange = computed(() => {
  if (datedNotes.value.length === 0) {
    const currentDay = dateToDayNumber(
      { year: cal.value.currentYear, month: cal.value.currentMonth, day: cal.value.currentDay },
      cal.value,
    );
    return { min: currentDay - 28, max: currentDay + 28, span: 56 };
  }
  const days = datedNotes.value.map((n) => dateToDayNumber(n.date!, cal.value));
  const minD = Math.min(...days);
  const maxD = Math.max(...days);
  const pad = Math.max(14, (maxD - minD) * 0.1);
  return { min: minD - pad, max: maxD + pad, span: maxD - minD + pad * 2 };
});

const timelineWidth = computed(() => Math.max(timelineRange.value.span * zoom.value, 1200));

// Current in-game date marker position
const currentDayPos = computed(() => {
  const day = dateToDayNumber(
    { year: cal.value.currentYear, month: cal.value.currentMonth, day: cal.value.currentDay },
    cal.value,
  );
  return (day - timelineRange.value.min) * zoom.value;
});

// Note positions
const notePositions = computed(() =>
  datedNotes.value.map((note) => {
    const day = dateToDayNumber(note.date!, cal.value);
    const x = (day - timelineRange.value.min) * zoom.value;
    return { note, x, day };
  }),
);

// Year/month tick marks
const ticks = computed(() => {
  const result: { x: number; label: string; isMajor: boolean }[] = [];
  const totalDaysPerYear = cal.value.months.reduce((s, m) => s + m.days, 0);
  const { min, max } = timelineRange.value;

  // Find first year to show
  const startYear = Math.floor(min / totalDaysPerYear) + 1;
  const endYear = Math.ceil(max / totalDaysPerYear) + 1;

  for (let y = startYear; y <= endYear; y++) {
    // Year tick
    const yearDay = (y - 1) * totalDaysPerYear + 1;
    if (yearDay >= min && yearDay <= max) {
      const x = (yearDay - min) * zoom.value;
      result.push({ x, label: `${y} ${cal.value.yearSuffix}`, isMajor: true });
    }
    // Month ticks
    let monthDay = (y - 1) * totalDaysPerYear;
    for (let m = 0; m < cal.value.months.length; m++) {
      monthDay += 1;
      if (monthDay >= min && monthDay <= max && zoom.value >= 3) {
        const x = (monthDay - min) * zoom.value;
        const label = zoom.value >= 6 ? cal.value.months[m].name.slice(0, 3) : '';
        // Don't duplicate year tick
        if (m > 0) result.push({ x, label, isMajor: false });
      }
      monthDay += cal.value.months[m].days - 1;
    }
  }
  return result;
});

// Priority → visual size
function nodeRadius(priority: number): number {
  return [0, 5, 7, 9, 12, 16][priority] ?? 9;
}
function nodeColor(priority: number): string {
  return ['', 'var(--text-muted)', 'var(--blue)', 'var(--green)', 'var(--yellow)', 'var(--accent)'][priority] ?? 'var(--green)';
}
// Show label on node if priority >= 4 or zoomed in enough
function showLabel(priority: number): boolean {
  return priority >= 4 || zoom.value >= 20;
}

function zoomIn() { zoom.value = Math.min(MAX_ZOOM, zoom.value * 1.5); }
function zoomOut() { zoom.value = Math.max(MIN_ZOOM, zoom.value / 1.5); }
function zoomReset() { zoom.value = 8; }

function onWheel(e: WheelEvent) {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    // Zoom
    const factor = e.deltaY > 0 ? 0.85 : 1.15;
    zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * factor));
  } else {
    // Scroll
    if (timelineEl.value) timelineEl.value.scrollLeft += e.deltaX || e.deltaY;
  }
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  isDragging.value = true;
  dragStart.value = e.clientX;
  dragScrollStart.value = timelineEl.value?.scrollLeft ?? 0;
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}
function onMouseMove(e: MouseEvent) {
  if (!isDragging.value || !timelineEl.value) return;
  timelineEl.value.scrollLeft = dragScrollStart.value - (e.clientX - dragStart.value);
}
function onMouseUp() {
  isDragging.value = false;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
}

function showTooltip(e: MouseEvent, note: Note) {
  hoveredNoteId.value = note.id;
  tooltipNote.value = note;
  tooltipX.value = e.clientX;
  tooltipY.value = e.clientY;
}
function hideTooltip() {
  hoveredNoteId.value = null;
  tooltipNote.value = null;
}
function moveTooltip(e: MouseEvent) {
  tooltipX.value = e.clientX;
  tooltipY.value = e.clientY;
}

function openNote(id: string) {
  notesStore.setActiveNote(id);
  window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'journal' }));
}

function scrollToCurrentDate() {
  if (!timelineEl.value) return;
  const containerW = timelineEl.value.clientWidth;
  timelineEl.value.scrollLeft = currentDayPos.value - containerW / 2;
}

onMounted(() => {
  // Scroll to current date after mount
  setTimeout(scrollToCurrentDate, 100);
});
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
});
</script>

<template>
  <div class="timeline-view">
    <!-- Toolbar -->
    <div class="tl-toolbar">
      <span class="tl-title">Timeline</span>
      <div class="tl-controls">
        <button class="btn btn-sm" @click="zoomOut" title="Zoom out">−</button>
        <span class="zoom-label">{{ Math.round(zoom) }}px/day</span>
        <button class="btn btn-sm" @click="zoomIn" title="Zoom in">＋</button>
        <button class="btn btn-sm btn-ghost" @click="zoomReset">Reset zoom</button>
        <button class="btn btn-sm" @click="scrollToCurrentDate">📅 Today</button>
      </div>
      <div class="tl-legend">
        <span v-for="p in [1,2,3,4,5]" :key="p" class="legend-item">
          <span class="legend-dot" :style="{ background: nodeColor(p), width: nodeRadius(p)*2+'px', height: nodeRadius(p)*2+'px' }" />
          <span class="legend-label">{{ ['','Minor','Low','Normal','Important','Milestone'][p] }}</span>
        </span>
      </div>
    </div>

    <!-- Timeline scroll container -->
    <div
      class="tl-scroll"
      ref="timelineEl"
      @wheel.prevent="onWheel"
      @mousedown="onMouseDown"
      :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
    >
      <div class="tl-canvas" :style="{ width: timelineWidth + 'px' }">
        <!-- Tick marks -->
        <div class="tl-axis">
          <div
            v-for="tick in ticks"
            :key="tick.x + tick.label"
            class="tl-tick"
            :class="{ major: tick.isMajor }"
            :style="{ left: tick.x + 'px' }"
          >
            <div class="tick-line" />
            <div class="tick-label">{{ tick.label }}</div>
          </div>
        </div>

        <!-- Track -->
        <div class="tl-track">
          <!-- Current date marker -->
          <div
            class="tl-current-marker"
            :style="{ left: currentDayPos + 'px' }"
            title="Current in-game date"
          />

          <!-- Note nodes -->
          <div
            v-for="{ note, x } in notePositions"
            :key="note.id"
            class="tl-node"
            :style="{
              left: x + 'px',
              width: nodeRadius(note.priority) * 2 + 'px',
              height: nodeRadius(note.priority) * 2 + 'px',
              background: nodeColor(note.priority),
              zIndex: note.priority,
            }"
            :class="{ hovered: hoveredNoteId === note.id }"
            @mouseenter="showTooltip($event, note)"
            @mouseleave="hideTooltip"
            @mousemove="moveTooltip"
            @click="openNote(note.id)"
          >
            <span v-if="showLabel(note.priority)" class="node-label">{{ note.title }}</span>
          </div>
        </div>

        <!-- Axis baseline -->
        <div class="tl-baseline" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="datedNotes.length === 0" class="tl-empty">
      <p>No dated notes yet.</p>
      <p class="text-muted text-sm">Add a date tag like <code>#998-01-15</code> to a note to see it here.</p>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="tooltipNote"
        class="tl-tooltip"
        :style="{ left: tooltipX + 14 + 'px', top: tooltipY - 10 + 'px' }"
      >
        <div class="tooltip-title">{{ tooltipNote.title }}</div>
        <div class="tooltip-date">{{ dateToLabel(tooltipNote.date!, cal) }}</div>
        <div class="tooltip-priority">Priority: {{ ['','Minor','Low','Normal','Important','Milestone'][tooltipNote.priority] }}</div>
        <div class="tooltip-hint">Click to open</div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.timeline-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

/* Toolbar */
.tl-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.tl-title { font-size: 15px; font-weight: 700; color: var(--text); }
.tl-controls { display: flex; align-items: center; gap: 6px; }
.zoom-label { font-size: 12px; font-family: var(--font-mono); color: var(--text-muted); min-width: 70px; text-align: center; }

.tl-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  flex-wrap: wrap;
}
.legend-item { display: flex; align-items: center; gap: 5px; }
.legend-dot { border-radius: 50%; display: inline-block; flex-shrink: 0; }
.legend-label { font-size: 11px; color: var(--text-muted); }

/* Scroll container */
.tl-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  user-select: none;
}

.tl-canvas {
  height: 100%;
  position: relative;
  min-height: 200px;
}

/* Axis with tick marks */
.tl-axis {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
}
.tl-tick {
  position: absolute;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
}
.tick-line {
  width: 1px;
  height: 10px;
  background: var(--border);
}
.tl-tick.major .tick-line { height: 18px; background: var(--text-subtle); }
.tick-label {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  margin-top: 3px;
}
.tl-tick.major .tick-label { color: var(--text-subtle); font-weight: 600; font-size: 11px; }

/* Baseline */
.tl-baseline {
  position: absolute;
  top: 50px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--border);
}

/* Track */
.tl-track {
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  bottom: 0;
}

/* Current date marker */
.tl-current-marker {
  position: absolute;
  top: -12px;
  width: 2px;
  height: calc(100% + 12px);
  background: var(--accent);
  opacity: 0.6;
  transform: translateX(-1px);
}
.tl-current-marker::before {
  content: '▼';
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--accent);
  font-size: 10px;
}

/* Note nodes */
.tl-node {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid var(--bg);
  transition: transform 0.15s, box-shadow 0.15s;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.tl-node:hover, .tl-node.hovered {
  transform: translate(-50%, -50%) scale(1.35);
  box-shadow: 0 0 0 3px var(--accent-glow), 0 2px 12px rgba(0,0,0,0.4);
  z-index: 100 !important;
}
.node-label {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 10px;
  font-weight: 600;
  color: var(--text);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 5px;
  pointer-events: none;
}

/* Tooltip */
.tl-empty {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--text-subtle);
  pointer-events: none;
}

</style>

<!-- Tooltip is teleported to body, no scoped -->
<style>
.tl-tooltip {
  position: fixed;
  z-index: 9999;
  background: var(--bg-elevated);
  border: 1px solid var(--accent-dim);
  border-radius: 6px;
  padding: 10px 14px;
  min-width: 180px;
  pointer-events: none;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.tooltip-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.tooltip-date { font-size: 11px; color: var(--accent); font-family: var(--font-mono); margin-bottom: 2px; }
.tooltip-priority { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.tooltip-hint { font-size: 10px; color: var(--text-muted); font-style: italic; }
</style>
