import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Note, NotePriority } from '@/types';
import { parsePrimaryDate, parsePriority, newNoteTemplate } from '@/utils/dateParser';
import { readTextFile, writeTextFile, readDir, removeFile, renameFile, mkdir, exists } from '@/utils/fileSystem';
import { useSettingsStore } from './settings';

function titleFromPath(filePath: string): string {
  const base = filePath.split('/').pop() ?? filePath;
  return base.replace(/\.md$/, '');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useNotesStore = defineStore('notes', () => {
  const settingsStore = useSettingsStore();
  const notes = ref<Note[]>([]);
  const activeNoteId = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const activeNote = computed(() =>
    activeNoteId.value ? notes.value.find((n) => n.id === activeNoteId.value) ?? null : null,
  );

  const notesWithDates = computed(() => notes.value.filter((n) => n.date !== undefined));

  async function loadNotes() {
    const dir = settingsStore.settings.notesDirectory;
    if (!dir) return;
    loading.value = true;
    error.value = null;
    try {
      const dirExists = await exists(dir);
      if (!dirExists) await mkdir(dir);
      const entries = await readDir(dir);
      const mdFiles = entries.filter((e) => !e.isDirectory && e.name.endsWith('.md'));

      const loaded: Note[] = await Promise.all(
        mdFiles.map(async (entry) => {
          const content = await readTextFile(entry.path);
          const date = parsePrimaryDate(content);
          const priority = parsePriority(content) as NotePriority;
          return {
            id: entry.path, // use file path as stable id
            title: titleFromPath(entry.path),
            content,
            filePath: entry.path,
            date,
            priority,
            createdAt: '',
            updatedAt: '',
          };
        }),
      );

      notes.value = loaded.sort((a, b) => a.title.localeCompare(b.title));
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  async function createNote(title?: string) {
    const dir = settingsStore.settings.notesDirectory;
    if (!dir) return;
    const noteName = title ?? `Untitled-${generateId()}`;
    const filePath = `${dir}/${noteName}.md`;
    const template = newNoteTemplate(settingsStore.settings.calendar);
    await writeTextFile(filePath, template);
    const note: Note = {
      id: filePath,
      title: noteName,
      content: template,
      filePath,
      date: undefined,
      priority: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    notes.value = [...notes.value, note].sort((a, b) => a.title.localeCompare(b.title));
    activeNoteId.value = filePath;
    return note;
  }

  async function saveNote(id: string, content: string) {
    const note = notes.value.find((n) => n.id === id);
    if (!note) return;
    await writeTextFile(note.filePath, content);
    const date = parsePrimaryDate(content);
    const priority = parsePriority(content) as NotePriority;
    Object.assign(note, { content, date, priority, updatedAt: new Date().toISOString() });
  }

  async function renameNote(id: string, newTitle: string) {
    const note = notes.value.find((n) => n.id === id);
    if (!note) return;
    const dir = settingsStore.settings.notesDirectory;
    const newPath = `${dir}/${newTitle}.md`;
    await renameFile(note.filePath, newPath);
    note.title = newTitle;
    note.filePath = newPath;
    note.id = newPath;
    if (activeNoteId.value === id) activeNoteId.value = newPath;
  }

  async function deleteNote(id: string) {
    const note = notes.value.find((n) => n.id === id);
    if (!note) return;
    await removeFile(note.filePath);
    notes.value = notes.value.filter((n) => n.id !== id);
    if (activeNoteId.value === id) activeNoteId.value = null;
  }

  function setActiveNote(id: string | null) {
    activeNoteId.value = id;
  }

  return {
    notes,
    activeNoteId,
    activeNote,
    notesWithDates,
    loading,
    error,
    loadNotes,
    createNote,
    saveNote,
    renameNote,
    deleteNote,
    setActiveNote,
  };
});
