import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { AppSettings, CalendarConfig } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getDocumentDir, mkdir, exists } from '@/utils/fileSystem';

const STORAGE_KEY = 'campaign-journal-settings';

function loadFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppSettings;
      // Merge with defaults so new fields are always present
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        calendar: { ...DEFAULT_SETTINGS.calendar, ...parsed.calendar },
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS, calendar: { ...DEFAULT_SETTINGS.calendar } };
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(loadFromStorage());

  // Auto-save to localStorage on every change
  watch(
    settings,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    },
    { deep: true },
  );

  async function initNotesDirectory() {
    if (settings.value.notesDirectory) return;
    try {
      const docDir = await getDocumentDir();
      const notesDir = `${docDir}/CampaignJournal`;
      const dirExists = await exists(notesDir);
      if (!dirExists) {
        await mkdir(notesDir);
      }
      settings.value.notesDirectory = notesDir;
    } catch (e) {
      console.error('Failed to init notes directory:', e);
    }
  }

  function updateCalendar(cal: Partial<CalendarConfig>) {
    settings.value.calendar = { ...settings.value.calendar, ...cal };
  }

  function setNotesDirectory(dir: string) {
    settings.value.notesDirectory = dir;
  }

  return { settings, initNotesDirectory, updateCalendar, setNotesDirectory };
});
