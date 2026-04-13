<script setup lang="ts">
import type { AppTab } from '@/types';

const props = defineProps<{ active: AppTab }>();
const emit = defineEmits<{ change: [tab: AppTab] }>();

const tabs: { id: AppTab; label: string; icon: string }[] = [
  { id: 'journal',  label: 'Journal',  icon: '📖' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'timeline', label: 'Timeline', icon: '⏳' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];
</script>

<template>
  <header class="tab-bar">
    <div class="tab-bar-brand">
      <span class="brand-icon">⚔️</span>
      <span class="brand-name">Campaign Journal</span>
    </div>
    <nav class="tab-bar-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: props.active === tab.id }"
        @click="emit('change', tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>
    <div class="tab-bar-spacer" />
  </header>
</template>

<style scoped>
.tab-bar {
  height: var(--tab-h);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 12px;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
}

.tab-bar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 24px;
  border-right: 1px solid var(--border);
  margin-right: 8px;
}
.brand-icon { font-size: 18px; }
.brand-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--text);
  white-space: nowrap;
}

.tab-bar-nav {
  display: flex;
  gap: 2px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-subtle);
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.tab-btn:hover {
  background: var(--bg-elevated);
  color: var(--text);
}
.tab-btn.active {
  background: var(--bg-elevated);
  color: var(--accent);
}
.tab-icon { font-size: 15px; line-height: 1; }
.tab-bar-spacer { flex: 1; }
</style>
