<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Typography from '@tiptap/extension-typography';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Markdown } from 'tiptap-markdown';
import { common, createLowlight } from 'lowlight';
import { useNotesStore } from '@/stores/notes';

const lowlight = createLowlight(common);
const notesStore = useNotesStore();

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const saving = ref(false);
const wordCount = ref(0);

const editor = useEditor({
  extensions: [
    StarterKit.configure({ codeBlock: false }),
    Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: true }),
    Placeholder.configure({ placeholder: 'Begin writing your note… (Markdown supported)' }),
    Link.configure({ openOnClick: false, autolink: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Typography,
    CodeBlockLowlight.configure({ lowlight }),
  ],
  content: '',
  onUpdate({ editor }) {
    const md = editor.storage.markdown.getMarkdown();
    wordCount.value = md.trim() ? md.trim().split(/\s+/).length : 0;
    scheduleSave(md);
  },
  editorProps: {
    attributes: {
      class: 'tiptap-editor',
      spellcheck: 'true',
    },
  },
});

function scheduleSave(content: string) {
  if (!notesStore.activeNoteId) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    saving.value = true;
    await notesStore.saveNote(notesStore.activeNoteId!, content);
    saving.value = false;
  }, 800);
}

// Load note content when active note changes
watch(
  () => notesStore.activeNote,
  (note) => {
    if (!editor.value) return;
    if (!note) {
      editor.value.commands.setContent('');
      return;
    }
    // Only update if content differs (avoid cursor jump on save)
    const current = editor.value.storage.markdown.getMarkdown();
    if (current !== note.content) {
      editor.value.commands.setContent(note.content);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (saveTimeout) clearTimeout(saveTimeout);
  editor.value?.destroy();
});

// Toolbar helpers
function toggleBold() { editor.value?.chain().focus().toggleBold().run(); }
function toggleItalic() { editor.value?.chain().focus().toggleItalic().run(); }
function toggleStrike() { editor.value?.chain().focus().toggleStrike().run(); }
function toggleCode() { editor.value?.chain().focus().toggleCode().run(); }
function toggleHeading(level: 1 | 2 | 3) { editor.value?.chain().focus().toggleHeading({ level }).run(); }
function toggleBulletList() { editor.value?.chain().focus().toggleBulletList().run(); }
function toggleOrderedList() { editor.value?.chain().focus().toggleOrderedList().run(); }
function toggleTaskList() { editor.value?.chain().focus().toggleTaskList().run(); }
function toggleBlockquote() { editor.value?.chain().focus().toggleBlockquote().run(); }
function toggleCodeBlock() { editor.value?.chain().focus().toggleCodeBlock().run(); }
function insertHr() { editor.value?.chain().focus().setHorizontalRule().run(); }

function isActive(name: string, opts?: Record<string, unknown>) {
  return editor.value?.isActive(name, opts) ?? false;
}

const noteTitle = computed(() => notesStore.activeNote?.title ?? '');
</script>

<template>
  <div class="note-editor">
    <!-- Empty state -->
    <div v-if="!notesStore.activeNote" class="empty-editor">
      <div class="empty-icon">📖</div>
      <p class="empty-title">No note selected</p>
      <p class="empty-hint">Select a note from the sidebar, or create a new one.</p>
      <button class="btn btn-primary" @click="notesStore.createNote()">＋ New Note</button>
    </div>

    <template v-else>
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="tool-btn" :class="{ active: isActive('heading', { level: 1 }) }" @click="toggleHeading(1)" title="Heading 1">H1</button>
          <button class="tool-btn" :class="{ active: isActive('heading', { level: 2 }) }" @click="toggleHeading(2)" title="Heading 2">H2</button>
          <button class="tool-btn" :class="{ active: isActive('heading', { level: 3 }) }" @click="toggleHeading(3)" title="Heading 3">H3</button>
        </div>
        <div class="toolbar-sep" />
        <div class="toolbar-group">
          <button class="tool-btn" :class="{ active: isActive('bold') }" @click="toggleBold" title="Bold (⌘B)"><b>B</b></button>
          <button class="tool-btn" :class="{ active: isActive('italic') }" @click="toggleItalic" title="Italic (⌘I)"><em>I</em></button>
          <button class="tool-btn" :class="{ active: isActive('strike') }" @click="toggleStrike" title="Strikethrough"><s>S</s></button>
          <button class="tool-btn" :class="{ active: isActive('code') }" @click="toggleCode" title="Inline code"><code>`</code></button>
        </div>
        <div class="toolbar-sep" />
        <div class="toolbar-group">
          <button class="tool-btn" :class="{ active: isActive('bulletList') }" @click="toggleBulletList" title="Bullet list">• List</button>
          <button class="tool-btn" :class="{ active: isActive('orderedList') }" @click="toggleOrderedList" title="Ordered list">1. List</button>
          <button class="tool-btn" :class="{ active: isActive('taskList') }" @click="toggleTaskList" title="Task list">☑ Tasks</button>
        </div>
        <div class="toolbar-sep" />
        <div class="toolbar-group">
          <button class="tool-btn" :class="{ active: isActive('blockquote') }" @click="toggleBlockquote" title="Blockquote">❝</button>
          <button class="tool-btn" :class="{ active: isActive('codeBlock') }" @click="toggleCodeBlock" title="Code block">&lt;/&gt;</button>
          <button class="tool-btn" @click="insertHr" title="Divider">—</button>
        </div>
        <div class="toolbar-spacer" />
        <div class="toolbar-status">
          <span v-if="saving" class="status-saving">Saving…</span>
          <span v-else class="status-saved">Saved</span>
          <span class="word-count">{{ wordCount }} words</span>
        </div>
      </div>

      <!-- Note title bar -->
      <div class="note-title-bar">
        <span class="note-title-text">{{ noteTitle }}</span>
        <span v-if="notesStore.activeNote?.date" class="note-date-badge">
          📅 {{ notesStore.activeNote.date.year }}-{{ String(notesStore.activeNote.date.month).padStart(2,'0') }}-{{ String(notesStore.activeNote.date.day).padStart(2,'0') }}
        </span>
      </div>

      <!-- Editor -->
      <div class="editor-scroll">
        <div class="editor-wrap tiptap-editor">
          <EditorContent :editor="editor" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.note-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

/* Empty state */
.empty-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-muted);
}
.empty-icon { font-size: 48px; opacity: 0.4; }
.empty-title { font-size: 18px; font-weight: 600; color: var(--text-subtle); }
.empty-hint { font-size: 13px; }

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.toolbar-group { display: flex; gap: 2px; }
.toolbar-sep {
  width: 1px;
  height: 18px;
  background: var(--border);
  margin: 0 4px;
  flex-shrink: 0;
}
.toolbar-spacer { flex: 1; }
.toolbar-status {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: var(--text-muted);
}
.status-saving { color: var(--yellow); }
.status-saved { color: var(--green); }
.word-count { color: var(--text-muted); }

.tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 26px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-subtle);
  background: transparent;
  transition: background 0.12s, color 0.12s;
  font-weight: 600;
}
.tool-btn:hover { background: var(--bg-elevated); color: var(--text); }
.tool-btn.active { background: var(--accent-glow); color: var(--accent); }

/* Note title bar */
.note-title-bar {
  padding: 10px 40px 6px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg);
}
.note-title-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-subtle);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-date-badge {
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-glow);
  border: 1px solid var(--accent-dim);
  border-radius: 4px;
  padding: 1px 7px;
  flex-shrink: 0;
  font-family: var(--font-mono);
}

/* Editor scroll area */
.editor-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 28px 40px 60px;
}
.editor-wrap {
  max-width: 740px;
  margin: 0 auto;
}
</style>
