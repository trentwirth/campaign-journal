# Campaign Journal

A desktop TTRPG note-taking app built with [Tauri v2](https://tauri.app/) + [Vue 3](https://vuejs.org/). Think Obsidian MD, purpose-built for tabletop RPG game masters — with a live fantasy calendar and an interactive event timeline baked right in.

Defaults to the **Eberron Galifar Calendar** (12 months × 28 days, 998 YK), but every calendar setting is configurable for any campaign world.

---

## Features

| Tab | What it does |
|---|---|
| **Journal** | Obsidian-style markdown editor. Full WYSIWYG: headings, bold/italic, lists, task lists, code blocks, blockquotes, links. Auto-saves as `.md` files on disk. |
| **Calendar** | Renders your campaign calendar as a grid. Days with notes are highlighted. Click any day to see its notes. Advance the in-game date with arrow buttons or click the date to edit it directly. |
| **Timeline** | Horizontal scrollable timeline. All dated notes appear as nodes sized by priority. Zoom in/out, drag to scroll, hover for details, click to open. |
| **Settings** | Configure your calendar (name, year suffix, months, weekday names, days per week) and choose your notes folder. |

### Date tags

Add a date tag anywhere in a note body to link it to the Calendar and Timeline:

```
#998-01-15
```

Format: `#YEAR-MONTH-DAY` (numeric month, 1-indexed). Every new note gets a placeholder tag at the top as a reminder — replace `MM` and `DD` or delete it if you don't need a date.

### Priority

Add a `priority` field to a note's frontmatter to control how prominent it appears on the timeline:

```yaml
---
priority: 5
---
```

| Value | Label | Timeline appearance |
|---|---|---|
| 1 | Minor | Tiny dot, visible only when zoomed in |
| 2 | Low | Small dot |
| 3 | Normal | Medium node (default) |
| 4 | Important | Large node, label always visible |
| 5 | Milestone | Extra-large node, accent color |

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable toolchain)
- macOS, Windows, or Linux

On macOS you may also need Xcode Command Line Tools:
```bash
xcode-select --install
```

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/trentonwirth/campaign-journal.git
cd campaign-journal

# 2. Install JS dependencies
npm install

# 3. (Optional) Replace placeholder icons with your own
#    Put a 1024×1024 PNG at src-tauri/icons/app-icon.png, then:
npm run tauri icon src-tauri/icons/app-icon.png
```

### Run in development

```bash
npm run tauri dev
```

First launch compiles the Rust backend — this takes a few minutes. Subsequent launches are fast.

### Build for distribution

```bash
npm run tauri build
```

The packaged app is output to `src-tauri/target/release/bundle/`.

---

## Usage

### First launch

1. The app automatically creates a `CampaignJournal/` folder in your Documents directory.
2. Go to **Settings** to change the notes folder or customize your calendar.
3. Create your first note from the **Journal** tab sidebar (＋ button).

### Writing notes

- The editor is WYSIWYG — type markdown syntax and it renders live.
- Use the toolbar for formatting shortcuts, or standard keyboard shortcuts (`⌘B`, `⌘I`, etc.).
- Notes auto-save ~800 ms after you stop typing. The status shows **Saved** / **Saving…**.
- Double-click a note title in the sidebar to rename it.

### Setting the in-game date

In the **Calendar** tab header:
- **‹ ›** arrows step the in-game date back/forward one day.
- **Click the date** to edit it directly (day input → month dropdown → year input → ✓ to confirm, Esc to cancel).
- **Jump to Today** scrolls the calendar view to the current in-game date.

You can also set the date in **Settings → Current In-Game Date**.

### Linking notes to the calendar

Type a date tag in your note:
```
#998-04-07
```
The note immediately appears on that day in the Calendar and as a node on the Timeline. A note can have multiple date tags; the first one found is used as its primary date.

### Timeline navigation

- **Scroll**: mouse wheel or click-drag left/right.
- **Zoom**: `Ctrl+scroll` or the `−` / `＋` buttons in the toolbar.
- **Today**: scrolls the view to the current in-game date marker (purple line).
- **Open a note**: click any node.

---

## Calendar configuration

Go to **Settings → Calendar** to customize:

- **Calendar name** and **year suffix** (e.g. `YK`, `DR`, `CE`)
- **Months** — add, remove, rename, change day counts
- **Days per week** and **weekday names**
- **Current in-game date**

Hit **Save Calendar Settings** to apply. The calendar and timeline update immediately.

To reset to the Eberron Galifar Calendar defaults, click **Reset to Eberron defaults**.

---

## Project structure

```
campaign-journal/
├── src/                        # Vue 3 frontend
│   ├── components/
│   │   ├── journal/            # Note editor, file tree
│   │   ├── calendar/           # Calendar grid
│   │   ├── timeline/           # Timeline view
│   │   └── settings/           # Settings panel
│   ├── stores/                 # Pinia state (notes, settings)
│   ├── types/                  # TypeScript interfaces
│   └── utils/                  # Date parsing, filesystem wrappers
├── src-tauri/                  # Rust / Tauri backend
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   ├── capabilities/           # Tauri permission scopes
│   └── tauri.conf.json
├── index.html
├── package.json
└── vite.config.ts
```

Notes are stored as plain `.md` files in your chosen directory — fully portable, editable in any text editor.
