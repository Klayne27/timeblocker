import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Block, BlockDraft, BlockTiming } from '@/types'
import { useTimeblockStore } from '@/store'
import { nextColor } from '@/lib/colors'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TopBar } from '@/components/TopBar'
import { WeekGrid } from '@/components/WeekGrid'
import { BlockDialog, type EditTarget } from '@/components/BlockDialog'
import { ImportDialog } from '@/components/ImportDialog'

interface PendingImport {
  blocks: Block[]
  skipped: number
}

const plural = (n: number) => `${n} block${n === 1 ? '' : 's'}`

/** True when focus is in a text field or a dialog/menu is open. */
function isKeyboardBusy(target: EventTarget | null): boolean {
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  ) {
    return true
  }
  return document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]') !== null
}

export default function App() {
  const add = useTimeblockStore((s) => s.add)
  const update = useTimeblockStore((s) => s.update)
  const remove = useTimeblockStore((s) => s.remove)
  const restore = useTimeblockStore((s) => s.restore)
  const select = useTimeblockStore((s) => s.select)
  const replaceAll = useTimeblockStore((s) => s.replaceAll)
  const merge = useTimeblockStore((s) => s.merge)
  const blockCount = useTimeblockStore((s) => s.blocks.length)

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)

  const deleteWithUndo = useCallback(
    (id: string) => {
      const removed = remove(id)
      if (!removed) return
      toast(`Deleted “${removed.title.trim() || '(No title)'}”`, {
        action: { label: 'Undo', onClick: () => restore([removed]) },
      })
    },
    [remove, restore],
  )

  const handleCreate = useCallback(
    (timing: BlockTiming) => {
      const colors = useTimeblockStore.getState().blocks.map((b) => b.color)
      const block = add({ title: '', description: '', color: nextColor(colors), ...timing })
      select(block.id)
      setEditTarget({ block, isNew: true })
      setEditOpen(true)
    },
    [add, select],
  )

  const handleBlockClick = useCallback(
    (id: string) => {
      const block = useTimeblockStore.getState().blocks.find((b) => b.id === id)
      if (!block) return
      select(id)
      setEditTarget({ block, isNew: false })
      setEditOpen(true)
    },
    [select],
  )

  const handleSave = (id: string, values: BlockDraft) => {
    update(id, values)
    setEditOpen(false)
  }

  // Cancelling a block that was just created discards it, like Google Calendar.
  const handleCancel = () => {
    if (editTarget?.isNew) remove(editTarget.block.id)
    setEditOpen(false)
  }

  const handleDelete = (id: string) => {
    setEditOpen(false)
    if (editTarget?.isNew) remove(id)
    else deleteWithUndo(id)
  }

  const applyImport = (mode: 'replace' | 'merge', data: PendingImport) => {
    if (mode === 'replace') replaceAll(data.blocks)
    else merge(data.blocks)
    setPendingImport(null)
    toast.success(`Imported ${plural(data.blocks.length)}`, {
      description:
        data.skipped > 0 ? `${plural(data.skipped)} skipped because they were invalid.` : undefined,
    })
  }

  const handleImportFile = (blocks: Block[], skipped: number) => {
    const data = { blocks, skipped }
    // Nothing to replace or merge with: import straight away.
    if (useTimeblockStore.getState().blocks.length === 0) applyImport('replace', data)
    else setPendingImport(data)
  }

  // Delete/Backspace removes the selected block; Escape deselects.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isKeyboardBusy(e.target)) return
      const { selectedId } = useTimeblockStore.getState()
      if (!selectedId) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteWithUndo(selectedId)
      } else if (e.key === 'Escape') {
        select(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteWithUndo, select])

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-dvh flex-col overflow-hidden bg-white text-[#3c4043]">
        <TopBar onImportFile={handleImportFile} />
        <WeekGrid onCreate={handleCreate} onBlockClick={handleBlockClick} />
      </div>

      <BlockDialog
        open={editOpen}
        target={editTarget}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
      />

      <ImportDialog
        open={pendingImport !== null}
        incomingCount={pendingImport?.blocks.length ?? 0}
        skippedCount={pendingImport?.skipped ?? 0}
        currentCount={blockCount}
        onReplace={() => pendingImport && applyImport('replace', pendingImport)}
        onMerge={() => pendingImport && applyImport('merge', pendingImport)}
        onCancel={() => setPendingImport(null)}
      />

      <Toaster position="bottom-left" closeButton />
    </TooltipProvider>
  )
}
