<script setup lang="ts">
import { ref } from 'vue';
import FileTree from './FileTree.vue';
import NoteEditor from './NoteEditor.vue';

const sidebarCollapsed = ref(false);
</script>

<template>
  <div class="journal-layout">
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <FileTree />
    </aside>
    <div class="sidebar-resize" @click="sidebarCollapsed = !sidebarCollapsed" :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
      <span>{{ sidebarCollapsed ? '›' : '‹' }}</span>
    </div>
    <main class="editor-area">
      <NoteEditor />
    </main>
  </div>
</template>

<style scoped>
.journal-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
}
.sidebar.collapsed {
  width: 0;
}

.sidebar-resize {
  width: 10px;
  flex-shrink: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
  user-select: none;
}
.sidebar-resize:hover {
  background: var(--bg-elevated);
  color: var(--accent);
}

.editor-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
