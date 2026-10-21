import { AnimatePresence, motion } from 'framer-motion'
import type { Block } from '@/types'
import type { DragPreview } from '@/hooks/useGridInteractions'
import { FULL_WIDTH, type BlockLayout } from '@/lib/layout'
import { minutesToPx } from '@/lib/time'
import { cn } from '@/lib/utils'
import { TimeBlock } from '@/components/TimeBlock'

interface DayColumnProps {
  blocks: readonly Block[]
  layout: Map<string, BlockLayout>
  existingIds: Set<string>
  selectedId: string | null
  /** Id of the block currently being dragged (rendered as a faded ghost). */
  draggingId: string | null
  /** The live drag preview, when it is in this column. */
  previewBlock: Block | null
  preview: DragPreview | null
  isToday: boolean
  nowMinutes: number
}

export function DayColumn({
  blocks,
  layout,
  existingIds,
  selectedId,
  draggingId,
  previewBlock,
  preview,
  isToday,
  nowMinutes,
}: DayColumnProps) {
  return (
    <div className={cn('relative flex-1 border-l border-[#dadce0]', isToday && 'bg-[#1a73e8]/[0.025]')}>
      <AnimatePresence custom={existingIds}>
        {blocks.map((block) => (
          <TimeBlock
            key={block.id}
            block={block}
            layout={layout.get(block.id) ?? FULL_WIDTH}
            mode={block.id === draggingId ? 'ghost' : 'idle'}
            selected={block.id === selectedId}
          />
        ))}
      </AnimatePresence>

      {previewBlock && preview && (
        <TimeBlock block={previewBlock} layout={FULL_WIDTH} mode="dragging" dragKind={preview.kind} />
      )}

      {isToday && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 z-30"
          style={{ top: minutesToPx(nowMinutes) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          aria-hidden
        >
          <div className="absolute -top-px right-0 left-0 h-0.5 bg-[#ea4335]" />
          <div className="absolute -top-[5px] -left-[6px] size-3 rounded-full bg-[#ea4335]" />
        </motion.div>
      )}
    </div>
  )
}
