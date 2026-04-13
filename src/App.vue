<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { AppTab } from '@/types';
import TabBar from '@/components/TabBar.vue';
import JournalView from '@/components/journal/JournalView.vue';
import CalendarView from '@/components/calendar/CalendarView.vue';
import TimelineView from '@/components/timeline/TimelineView.vue';
import SettingsView from '@/components/settings/SettingsView.vue';
import { useSettingsStore } from '@/stores/settings';
import { useNotesStore } from '@/stores/notes';

const settingsStore = useSettingsStore();
const notesStore = useNotesStore();
const activeTab = ref<AppTab>('journal');

function onSwitchTab(e: Event) {
  activeTab.value = (e as CustomEvent<AppTab>).detail;
}

onMounted(async () => {
  await settingsStore.initNotesDirectory();
  await notesStore.loadNotes();
  window.addEventListener('switch-tab', onSwitchTab);
});

onBeforeUnmount(() => {
  window.removeEventListener('switch-tab', onSwitchTab);
});
</script>

<template>
  <div class="app-shell">
    <TabBar :active="activeTab" @change="activeTab = $event" />
    <div class="app-content">
      <JournalView v-show="activeTab === 'journal'" />
      <CalendarView v-show="activeTab === 'calendar'" />
      <TimelineView v-show="activeTab === 'timeline'" />
      <SettingsView v-show="activeTab === 'settings'" />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}
.app-content {
  flex: 1;
  overflow: hidden;
  display: flex;
}
.app-content > * {
  flex: 1;
  min-width: 0;
}
</style>
