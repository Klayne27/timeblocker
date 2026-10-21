import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ImportDialogProps {
  open: boolean
  incomingCount: number
  skippedCount: number
  currentCount: number
  onReplace: () => void
  onMerge: () => void
  onCancel: () => void
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function ImportDialog({
  open,
  incomingCount,
  skippedCount,
  currentCount,
  onReplace,
  onMerge,
  onCancel,
}: ImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 grid size-10 place-items-center rounded-full bg-[#e8f0fe] text-[#1a73e8]">
            <FileUp className="size-5" />
          </div>
          <DialogTitle>Import {plural(incomingCount, 'block')}?</DialogTitle>
          <DialogDescription>
            You currently have {plural(currentCount, 'block')}. Replace them with the imported
            schedule, or add the imported blocks alongside them.
            {skippedCount > 0 && (
              <span className="mt-2 block text-amber-700">
                {plural(skippedCount, 'invalid block')} in the file will be skipped.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={onMerge}>
              Merge with current schedule
            </Button>
            <Button onClick={onReplace}>Replace current schedule</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
