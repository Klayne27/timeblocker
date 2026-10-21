import { motion, type Variants } from 'framer-motion'
import type { Block } from '@/types'
import type { BlockLayout } from '@/lib/layout'
import type { DragKind } from '@/hooks/useGridInteractions'
import { contrastText } from '@/lib/colors'
import { clamp, formatRange, formatTime, minutesToPx, SNAP_MINUTES } from '@/lib/time'
import { cn } from '@/lib/utils'

interface TimeBlockProps {
  block: Block
  layout: BlockLayout
  /** idle: normal; ghost: original spot while dragging; dragging: the live preview. */
  mode: 'idle' | 'ghost' | 'dragging'
  selected?: boolean
  dragKind?: DragKind
}

/**
 * Exit is instant when the block still exists (it was moved to another day),
 * and animated when it was deleted. `existingIds` comes from AnimatePresence.
 */
const makeVariants = (id: string): Variants => ({
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  ghost: { opacity: 0.35, scale: 1, transition: { duration: 0.12 } },
  exit: (existingIds: Set<string>) =>
    existingIds.has(id)
      ? { opacity: 0, transition: { duration: 0 } }
      : { opacity: 0, scale: 0.9, transition: { duration: 0.16, ease: 'easeIn' } },
})

export function TimeBlock({ block, layout, mode, selected = false, dragKind }: TimeBlockProps) {
  const duration = block.end - block.start
  const height = Math.max(minutesToPx(duration) - 2, 8)
  const textColor = contrastText(block.color)
  const title = block.title.trim() || '(No title)'
  const range = formatRange(block.start, block.end)

  const tiny = duration <= SNAP_MINUTES
  const compact = duration < 45
  const descriptionLines = Math.floor((height - 40) / 16)
  const handleHeight = clamp(height / 4, 3, 7)

  const isDragging = mode === 'dragging'
  const labelBelow = block.start < 30

  const content = (
    <div
      className={cn(
        'relative h-full overflow-hidden rounded-[6px] text-left',
        tiny ? 'px-1.5 py-0' : compact ? 'px-2 py-0.5' : 'px-2 py-1',
      )}
      style={{ backgroundColor: block.color, color: textColor }}
    >
      {compact ? (
        <div
          className={cn(
            'truncate',
            tiny ? 'text-[10px] leading-[10px]' : 'text-xs leading-[18px]',
          )}
        >
          <span className="font-medium">{title}</span>
          <span className="opacity-90">, {formatTime(block.start)}</span>
        </div>
      ) : (
        <>
          <div className="truncate text-xs leading-4 font-medium">{title}</div>
          <div className="truncate text-xs leading-4 opacity-90">{range}</div>
          {block.description && descriptionLines > 0 && (
            <div
              className="mt-0.5 overflow-hidden text-[11px] leading-4 whitespace-pre-line opacity-85"
              style={{
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: descriptionLines,
              }}
            >
              {block.description}
            </div>
          )}
        </>
      )}
    </div>
  )

  if (isDragging) {
    return (
      <motion.div
        className="pointer-events-none absolute z-40 rounded-[6px]"
        style={{ top: minutesToPx(block.start), height, left: 2, right: 6 }}
        initial={{ scale: 1, boxShadow: '0 1px 3px rgba(60,64,67,0.3)' }}
        animate={{
          scale: dragKind === 'move' ? 1.02 : 1,
          boxShadow: '0 8px 24px rgba(60,64,67,0.35)',
        }}
        transition={{ duration: 0.12 }}
      >
        {content}
        <div
          className={cn(
            'absolute left-0 z-50 rounded bg-[#202124] px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-white shadow-md',
            labelBelow ? 'top-[calc(100%+4px)]' : '-top-6',
          )}
        >
          {range}
        </div>
      </motion.div>
    )
  }

  const variants = makeVariants(block.id)

  return (
    <motion.div
      data-block-id={block.id}
      role="button"
      aria-label={`${title}, ${range}`}
      variants={variants}
      initial="hidden"
      animate={mode === 'ghost' ? 'ghost' : 'visible'}
      exit="exit"
      whileHover={mode === 'idle' ? { y: -1 } : undefined}
      className={cn(
        'group absolute cursor-pointer touch-none rounded-[6px] select-none',
        'shadow-[0_1px_2px_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]',
        'transition-[left,width,box-shadow] duration-200 hover:shadow-[0_2px_6px_rgba(60,64,67,0.35)]',
        selected && 'ring-2 ring-[#1a73e8] ring-offset-1',
      )}
      style={{
        top: minutesToPx(block.start),
        height,
        left: `calc(${layout.left * 100}% + 2px)`,
        width: `calc(${layout.width * 100}% - 8px)`,
        zIndex: selected ? 20 : 10,
      }}
    >
      {content}
      {mode === 'idle' && (
        <>
          <div
            data-resize="top"
            className="absolute inset-x-0 top-0 cursor-ns-resize"
            style={{ height: handleHeight }}
          />
          <div
            data-resize="bottom"
            className="absolute inset-x-0 bottom-0 flex cursor-ns-resize items-end justify-center"
            style={{ height: handleHeight }}
          >
            {!compact && (
              <span
                className="mb-[2px] h-[3px] w-5 rounded-full opacity-0 transition-opacity group-hover:opacity-60"
                style={{ backgroundColor: textColor }}
              />
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}
