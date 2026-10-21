import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { CalendarRange, Download, EllipsisVertical, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { Block } from '@/types'
import { useTimeblockStore } from '@/store'
import { downloadExport, parseImport } from '@/lib/io'
import { formatDuration } from '@/lib/time'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface TopBarProps {
  /** Called with the valid blocks of a picked file. */
  onImportFile: (blocks: Block[], skipped: number) => void
}

const MAX_IMPORT_BYTES = 5 * 1024 * 1024

function WithTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function TopBar({ onImportFile }: TopBarProps) {
  const blocks = useTimeblockStore((s) => s.blocks)
  const clear = useTimeblockStore((s) => s.clear)
  const restore = useTimeblockStore((s) => s.restore)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmClear, setConfirmClear] = useState(false)


  const totalMinutes = blocks.reduce((sum, b) => sum + (b.end - b.start), 0)

  const openFilePicker = () => fileRef.current?.click()

  const handleExport = () => {
    downloadExport(blocks)
    toast.success(`Exported ${blocks.length} block${blocks.length === 1 ? '' : 's'}`)
  }

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error('Import failed', { description: 'The file is larger than 5 MB.' })
      return
    }
    const result = parseImport(await file.text())
    if (!result.ok) {
      toast.error('Import failed', { description: result.error })
      return
    }
    onImportFile(result.blocks, result.skipped)
  }

  const handleClear = () => {
    const previous = useTimeblockStore.getState().blocks
    clear()
    toast('Schedule cleared', {
      description: `${previous.length} block${previous.length === 1 ? '' : 's'} removed.`,
      action: { label: 'Undo', onClick: () => restore(previous) },
    })
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#dadce0] bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1a73e8] text-white shadow-sm">
          <CalendarRange className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[20px] leading-6 font-normal text-[#3c4043]">Timeblocker</h1>
          <p className="truncate text-xs text-[#70757a]">
            {blocks.length === 0
              ? 'Click or drag on the grid to add a block'
              : `${blocks.length} block${blocks.length === 1 ? '' : 's'} · ${formatDuration(totalMinutes)} per week`}
          </p>
        </div>
      </div>

      {/* Desktop actions */}
      <div className="hidden items-center gap-2 md:flex">
        <WithTooltip label="Load a backup file">
          <Button variant="outline" onClick={openFilePicker}>
            <Upload /> Import
          </Button>
        </WithTooltip>
        <WithTooltip label="Download a backup file">
          <Button variant="outline" onClick={handleExport}>
            <Download /> Export
          </Button>
        </WithTooltip>
        <WithTooltip label="Remove every block">
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmClear(true)}
            disabled={blocks.length === 0}
          >
            <Trash2 /> Clear all
          </Button>
        </WithTooltip>
      </div>

      {/* Narrow-screen actions */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={openFilePicker}>
              <Upload /> Import
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExport}>
              <Download /> Export
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={blocks.length === 0}
              onSelect={() => setConfirmClear(true)}
            >
              <Trash2 /> Clear all
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFile}
      />

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the whole week?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all {blocks.length} blocks from your schedule. Export a backup first if
              you might want them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleClear}>
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
