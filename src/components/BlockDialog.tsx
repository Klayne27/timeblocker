import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { AlignLeft, Clock, Palette, Trash2 } from 'lucide-react'
import type { Block, BlockDraft } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ColorPicker } from '@/components/ColorPicker'
import { TimeInput } from '@/components/TimeInput'
import {
  DAY_NAMES,
  formatDuration,
  formatTime,
  MIN_DURATION,
  MINUTES_PER_DAY,
  TIME_OPTIONS,
} from '@/lib/time'

/** Adds a block's own off-grid time (e.g. 10:10, from an import) to the options. */
function withValue(options: readonly number[], value: number | null): number[] {
  if (value === null || options.includes(value)) return [...options]
  return [...options, value].sort((a, b) => a - b)
}

export interface EditTarget {
  /** Snapshot of the block when the dialog opened. */
  block: Block
  isNew: boolean
}

interface BlockDialogProps {
  open: boolean
  target: EditTarget | null
  onSave: (id: string, values: BlockDraft) => void
  onCancel: () => void
  onDelete: (id: string) => void
}

export function BlockDialog({ open, target, onSave, onCancel, onDelete }: BlockDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        {target && (
          <BlockForm
            key={target.block.id}
            target={target}
            onSave={onSave}
            onCancel={onCancel}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface BlockFormProps extends Omit<BlockDialogProps, 'open' | 'target'> {
  target: EditTarget
}

function BlockForm({ target, onSave, onCancel, onDelete }: BlockFormProps) {
  const { block, isNew } = target
  const [title, setTitle] = useState(block.title)
  const [description, setDescription] = useState(block.description)
  const [day, setDay] = useState(block.day)
  const [start, setStart] = useState(block.start)
  const [end, setEnd] = useState(block.end)
  const [color, setColor] = useState(block.color)

  const [timeError, setTimeError] = useState<string | null>(null)

  const changeStart = (next: number): string | null => {
    if (next >= MINUTES_PER_DAY) return 'Start must be before midnight.'
    // Keep the duration when the start moves past the end.
    if (next >= end) setEnd(Math.min(MINUTES_PER_DAY, next + (end - start)))
    setStart(next)
    return null
  }

  const changeEnd = (next: number): string | null => {
    if (next <= start) return `End must be after the start (${formatTime(start)}).`
    setEnd(next)
    return null
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    // A time field rejected what was typed; keep the dialog open so it can be fixed.
    if (timeError) return
    onSave(block.id, {
      title: title.trim(),
      description: description.trim(),
      day,
      start,
      end: end > start ? end : Math.min(MINUTES_PER_DAY, start + MIN_DURATION),
      color,
    })
  }

  const onDescriptionKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
  }

  return (
    <motion.form
      onSubmit={submit}
      className="grid gap-5"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <DialogHeader>
        <DialogTitle>{isNew ? 'New time block' : 'Edit time block'}</DialogTitle>
        <DialogDescription>Repeats every week.</DialogDescription>
      </DialogHeader>

      <Input
        aria-label="Title"
        placeholder="Add title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        className="h-11 border-0 border-b-2 border-[#dadce0] rounded-none px-1 text-lg shadow-none focus-visible:border-[#1a73e8] focus-visible:ring-0"
      />

      <div className="grid gap-2">
        <Label className="flex items-center gap-2 text-muted-foreground">
          <Clock className="size-4" /> When
        </Label>
        <div className="grid grid-cols-[1.3fr_1fr_auto_1fr] items-center gap-2">
          <Select value={String(day)} onValueChange={(v) => setDay(Number(v))}>
            <SelectTrigger className="w-full" aria-label="Day">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_NAMES.map((name, i) => (
                <SelectItem key={name} value={String(i)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TimeInput
            label="Start time"
            value={start}
            options={withValue(TIME_OPTIONS.filter((m) => m < MINUTES_PER_DAY), start)}
            onCommit={changeStart}
            onError={setTimeError}
          />

          <span className="text-muted-foreground">–</span>

          <TimeInput
            label="End time"
            value={end}
            endOfDay
            options={withValue(TIME_OPTIONS.filter((m) => m > start), end)}
            describeOption={(m) => `(${formatDuration(m - start)})`}
            onCommit={changeEnd}
            onError={setTimeError}
          />
        </div>
        {timeError ? (
          <p className="text-xs text-destructive">{timeError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Type a time like 10, 930, 1735 or 5:35pm. Arrow keys step by 15 minutes.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="block-description" className="flex items-center gap-2 text-muted-foreground">
          <AlignLeft className="size-4" /> Description
        </Label>
        <Textarea
          id="block-description"
          placeholder="Add description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={onDescriptionKeyDown}
          rows={3}
          className="max-h-48 resize-y"
        />
      </div>

      <div className="grid gap-2">
        <Label className="flex items-center gap-2 text-muted-foreground">
          <Palette className="size-4" /> Color
        </Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <DialogFooter className="items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(block.id)}
        >
          <Trash2 /> Delete
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </DialogFooter>
    </motion.form>
  )
}
