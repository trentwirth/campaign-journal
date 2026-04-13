<script setup lang="ts">
import { ref, computed } from 'vue';
import { useNotesStore } from '@/stores/notes';
import { useSettingsStore } from '@/stores/settings';

const notesStore = useNotesStore();
const settingsStore = useSettingsStore();

const searchQuery = ref('');
const renamingId = ref<string | null>(null);
const renameValue = ref('');

const filtered = computed(() => {
  const q = searchQuery.value.toLowerCase();
  if (!q) return notesStore.notes;
  return notesStore.notes.filter((n) => n.title.toLowerCase().includes(q));
});

async function createNote() {
  await notesStore.createNote();
}

function selectNote(id: string) {
  notesStore.setActiveNote(id);
}

function startRename(id: string, currentTitle: string) {
  renamingId.value = id;
  renameValue.value = currentTitle;
}

async function confirmRename(id: string) {
  const newTitle = renameValue.value.trim();
  if (newTitle && newTitle !== notesStore.notes.find((n) => n.id === id)?.title) {
    await notesStore.renameNote(id, newTitle);
  }
  renamingId.value = null;
}

async function deleteNote(id: string) {
  if (confirm('Delete this note? This cannot be undone.')) {
    await notesStore.deleteNote(id);
  }
}

async function refresh() {
  await notesStore.loadNotes();
}
</script>

<template>
  <div class="file-tree">
    <div class="file-tree-header">
      <span class="header-title">Notes</span>
      <div class="header-actions">
        <button class="btn-icon" title="Refresh" @click="refresh">↺</button>
        <button class="btn-icon" title="New note" @click="createNote">＋</button>
      </div>
    </div>

    <div class="search-wrap">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search notes…"
        class="search-input"
      />
    </div>

    <div class="notes-dir text-sm text-muted" :title="settingsStore.settings.notesDirectory">
      {{ settingsStore.settings.notesDirectory?.split('/').pop() ?? 'No folder' }}
    </div>

    <ul class="note-list" v-if="filtered.length > 0">
      <li
        v-for="note in filtered"
        :key="note.id"
        class="note-item"
        :class="{ active: notesStore.activeNoteId === note.id }"
        @click="selectNote(note.id)"
        @dblclick="startRename(note.id, note.title)"
      >
        <span v-if="renamingId === note.id" class="rename-wrap" @click.stop>
          <input
            v-model="renameValue"
            class="rename-input"
            @keydown.enter="confirmRename(note.id)"
            @keydown.escape="renamingId = null"
            @blur="confirmRename(note.id)"
            autofocus
          />
        </span>
        <template v-else>
          <span class="note-icon">{{ note.date ? '📅' : '📝' }}</span>
          <span class="note-title truncate">{{ note.title }}</span>
          <div class="note-actions">
            <button class="btn-icon btn-sm" title="Rename" @click.stop="startRename(note.id, note.title)">✏️</button>
            <button class="btn-icon btn-sm btn-danger" title="Delete" @click.stop="deleteNote(note.id)">🗑</button>
          </div>
        </template>
      </li>
    </ul>

    <div v-else-if="notesStore.loading" class="empty-state">Loading…</div>
    <div v-else-if="searchQuery" class="empty-state">No notes match "{{ searchQuery }}"</div>
    <div v-else class="empty-state">
      <p>No notes yet.</p>
      <button class="btn btn-primary" style="margin-top:8px" @click="createNote">Create first note</button>
    </div>
  </div>
</template>

<style scoped>
.file-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.file-tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.header-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.header-actions {
  display: flex;
  gap: 4px;
}
.header-actions .btn-icon {
  font-size: 14px;
  padding: 3px 5px;
  color: var(--text-subtle);
}
.header-actions .btn-icon:hover { color: var(--accent); background: var(--bg-elevated); }

.search-wrap {
  padding: 8px 10px 4px;
  flex-shrink: 0;
}
.search-input {
  width: 100%;
  font-size: 12px;
  padding: 5px 8px;
  background: var(--bg-elevated);
}

.notes-dir {
  padding: 2px 12px 6px;
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.note-list {
  list-style: none;
  flex: 1;
  overflow-y: auto;
  padding: 4px 6px;
}

.note-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: var(--radius);
  cursor: pointer;
  user-select: none;
  position: relative;
}
.note-item:hover { background: var(--bg-elevated); }
.note-item.active { background: var(--accent-glow); color: var(--accent); }
.note-item.active .note-title { color: var(--accent); }

.note-icon { font-size: 13px; flex-shrink: 0; }
.note-title { flex: 1; font-size: 13px; color: var(--text); min-width: 0; }

.note-actions {
  display: none;
  gap: 2px;
  align-items: center;
  flex-shrink: 0;
}
.note-item:hover .note-actions { display: flex; }

.rename-wrap { width: 100%; }
.rename-input {
  width: 100%;
  font-size: 13px;
  padding: 2px 4px;
  background: var(--bg);
}

.empty-state {
  padding: 20px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
