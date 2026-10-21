# Timeblocker

A personal, recurring weekly time-blocking grid (Mon–Sun) styled after Google Calendar's week view. No dates, no backend — everything lives in `localStorage`.

## Run it

```bash
npm install
npm run dev
```

## How it was set up (from an empty folder)

```bash
# 1. Vite + React + TypeScript
npm create vite@latest . -- --template react-ts --no-interactive
npm install

# 2. Tailwind CSS v4 (Vite plugin)
npm install tailwindcss @tailwindcss/vite
#   - vite.config.ts: add tailwindcss() to plugins and the "@" → ./src alias
#   - tsconfig.json + tsconfig.app.json: "paths": { "@/*": ["./src/*"] }
#   - src/index.css: @import "tailwindcss";

# 3. shadcn/ui (Radix base, Nova preset)
npx shadcn@latest init -t vite -b radix -p nova --no-monorepo --no-rtl -y
npx shadcn@latest add button dialog input textarea label popover dropdown-menu alert-dialog tooltip sonner select -y

# 4. App libraries
npm install zustand framer-motion lucide-react sonner

# 5. The generated sonner.tsx used next-themes; it was changed to a fixed light theme
npm uninstall next-themes
```

## Using it

| Action | How |
| --- | --- |
| Create | Click empty space (1-hour block) or click-and-drag to draw one |
| Move | Drag a block up/down, or left/right to another day |
| Resize | Drag a block's top or bottom edge |
| Edit | Click a block |
| Delete | In the dialog, or select a block and press Delete/Backspace (with Undo) |
| Cancel | Escape cancels a drag or closes a dialog; cancelling a just-created block discards it |

Everything snaps to 15 minutes. Dragging near the top or bottom edge auto-scrolls the grid.

**Backups:** *Export* downloads `timeblocker-backup-YYYY-MM-DD.json`. *Import* validates the file, skips invalid blocks, and asks whether to replace or merge.

## Structure

```
src/
  App.tsx                     dialogs, keyboard shortcuts, toasts
  store.ts                    Zustand store, persisted as "timeblocker-v1" (schema version 1)
  types.ts
  components/
    TopBar.tsx                title, Import / Export / Clear all
    WeekGrid.tsx              scroll container, sticky header, columns
    TimeGutter.tsx            hour labels
    DayColumn.tsx             one day: blocks, drag preview, current-time line
    TimeBlock.tsx             a block (idle / ghost / dragging)
    BlockDialog.tsx           edit form
    ColorPicker.tsx           palette swatches + custom color popover
    ImportDialog.tsx          replace vs merge
    ui/                       shadcn components
  hooks/
    useGridInteractions.ts    pointer-event engine for create / move / resize
    useNow.ts
  lib/
    time.ts                   snapping, formatting, minute ↔ pixel conversion
    layout.ts                 side-by-side overlap layout
    colors.ts                 palette, contrast text, next default color
    io.ts                     import validation, export
```
