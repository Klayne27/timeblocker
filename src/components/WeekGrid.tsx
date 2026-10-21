import { useCallback, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import type { Block, BlockTiming } from '@/types'
import { useTimeblockStore } from '@/store'
import { useNow } from '@/hooks/useNow'
import { useGridInteractions } from '@/hooks/useGridInteractions'
import { computeDayLayout } from '@/lib/layout'
import { nextColor } from '@/lib/colors'
import {
  DAY_LABELS,
  DAY_NAMES,
  GRID_HEIGHT,
  HOUR_HEIGHT,
  INITIAL_SCROLL_HOUR,
  minutesSinceMidnight,
  weekdayIndex,
} from '@/lib/time'
import { cn } from '@/lib/utils'
import { DayColumn } from '@/components/DayColumn'
import { TimeGutter } from '@/components/TimeGutter'

interface WeekGridProps {
  onCreate: (timing: BlockTiming) => void
  onBlockClick: (id: string) => void
}

const DAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const

/** Hour lines plus fainter half-hour lines, drawn as a background. */
const GRID_LINES: CSSProperties = {
  backgroundImage: [
    `repeating-linear-gradient(to bottom, #dadce0 0 1px, transparent 1px ${HOUR_HEIGHT}px)`,
    `repeating-linear-gradient(to bottom, transparent 0 ${HOUR_HEIGHT / 2}px, #f1f3f4 ${HOUR_HEIGHT / 2}px ${HOUR_HEIGHT / 2 + 1}px, transparent ${HOUR_HEIGHT / 2 + 1}px ${HOUR_HEIGHT}px)`,
  ].join(','),
}

export function WeekGrid({ onCreate, onBlockClick }: WeekGridProps) {
  const blocks = useTimeblockStore((s) => s.blocks)
  const selectedId = useTimeblockStore((s) => s.selectedId)
  const update = useTimeblockStore((s) => s.update)

  const now = useNow()
  const today = weekdayIndex(now)
  const nowMinutes = minutesSinceMidnight(now)

  const scrollRef = useRef<HTMLDivElement>(null)
  const columnsRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = INITIAL_SCROLL_HOUR * HOUR_HEIGHT - 12
  }, [])

  const getBlock = useCallback(
    (id: string) => useTimeblockStore.getState().blocks.find((b) => b.id === id),
    [],
  )
  const onCommit = useCallback(
    (id: string, timing: BlockTiming) => update(id, timing),
    [update],
  )

  const { preview, handlers } = useGridInteractions({
    columnsRef,
    scrollRef,
    headerRef,
    getBlock,
    onCreate,
    onCommit,
    onBlockClick,
  })

  const blocksByDay = useMemo(
    () => DAY_INDEXES.map((day) => blocks.filter((b) => b.day === day)),
    [blocks],
  )
  const layouts = useMemo(() => blocksByDay.map((list) => computeDayLayout(list)), [blocksByDay])
  const existingIds = useMemo(() => new Set(blocks.map((b) => b.id)), [blocks])
  const newBlockColor = useMemo(() => nextColor(blocks.map((b) => b.color)), [blocks])

  const previewBlock: Block | null = useMemo(() => {
    if (!preview) return null
    const timing = { day: preview.day, start: preview.start, end: preview.end }
    if (preview.blockId) {
      const source = blocks.find((b) => b.id === preview.blockId)
      return source ? { ...source, ...timing } : null
    }
    return { id: '__new', title: '', description: '', color: newBlockColor, ...timing }
  }, [preview, blocks, newBlockColor])

  return (
    <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto bg-white">
      <div className="min-w-190">
        {/* Sticky day headers */}
        <div
          ref={headerRef}
          className="sticky top-0 z-30 flex border-b border-[#dadce0] bg-white"
        >
          <div className="sticky left-0 z-10 w-16 shrink-0 bg-white" />
          {DAY_INDEXES.map((day) => {
            const isToday = day === today
            return (
              <div key={day} className="relative flex flex-1 justify-center pt-3 pb-3">
                <span
                  className={cn(
                    'grid h-8 min-w-14 place-items-center rounded-full px-3 text-sm font-medium tracking-wide',
                    isToday ? 'bg-[#1a73e8] text-white shadow-sm' : 'text-[#3c4043]',
                  )}
                  title={isToday ? `${DAY_NAMES[day]} (today)` : DAY_NAMES[day]}
                >
                  {DAY_LABELS[day]}
                </span>
                <span className="absolute bottom-0 left-0 h-3 w-px bg-[#dadce0]" />
              </div>
            )
          })}
        </div>

        {/* Gutter + day columns */}
        <div className="flex">
          <TimeGutter />
          <div
            ref={columnsRef}
            className="relative flex flex-1 cursor-default"
            style={{ height: GRID_HEIGHT, ...GRID_LINES }}
            {...handlers}
          >
            {DAY_INDEXES.map((day) => (
              <DayColumn
                key={day}
                blocks={blocksByDay[day]}
                layout={layouts[day]}
                existingIds={existingIds}
                selectedId={selectedId}
                draggingId={preview?.blockId ?? null}
                previewBlock={previewBlock && previewBlock.day === day ? previewBlock : null}
                preview={preview}
                isToday={day === today}
                nowMinutes={nowMinutes}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
