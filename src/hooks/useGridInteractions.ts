import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import type { Block, BlockTiming } from '@/types'
import {
  clamp,
  DAYS_PER_WEEK,
  DEFAULT_DURATION,
  MIN_DURATION,
  MINUTES_PER_DAY,
  pxToMinutes,
  snapCeil,
  snapFloor,
  snapRound,
} from '@/lib/time'

export type DragKind = 'create' | 'move' | 'resize-top' | 'resize-bottom'

export interface DragPreview extends BlockTiming {
  kind: DragKind
  /** The block being moved/resized; null while drawing a new block. */
  blockId: string | null
}

interface Session {
  kind: DragKind
  pointerId: number
  blockId: string | null
  /** The block's timing at pointerdown (for create: the 15-min slot pressed). */
  origin: BlockTiming
  /** Minutes between the pointer and the edge being dragged. */
  grabOffset: number
  downX: number
  downY: number
  lastX: number
  lastY: number
  lastScrollTop: number
  moved: boolean
}

interface Options {
  columnsRef: RefObject<HTMLDivElement | null>
  scrollRef: RefObject<HTMLDivElement | null>
  headerRef: RefObject<HTMLDivElement | null>
  getBlock: (id: string) => Block | undefined
  onCreate: (timing: BlockTiming) => void
  onCommit: (id: string, timing: BlockTiming) => void
  onBlockClick: (id: string) => void
}

const DRAG_THRESHOLD_PX = 4
const AUTOSCROLL_EDGE_PX = 48
const AUTOSCROLL_MAX_SPEED = 16

const CURSORS: Record<DragKind, string> = {
  create: 'ns-resize',
  move: 'grabbing',
  'resize-top': 'ns-resize',
  'resize-bottom': 'ns-resize',
}

function sameTiming(a: BlockTiming, b: BlockTiming): boolean {
  return a.day === b.day && a.start === b.start && a.end === b.end
}

/**
 * Click-and-drag engine for the week grid, built on pointer events with
 * pointer capture. All results are snapped to 15 minutes and clamped to the
 * week. A press that moves less than a few pixels counts as a click.
 */
export function useGridInteractions({
  columnsRef,
  scrollRef,
  headerRef,
  getBlock,
  onCreate,
  onCommit,
  onBlockClick,
}: Options) {
  const [preview, setPreview] = useState<DragPreview | null>(null)
  const sessionRef = useRef<Session | null>(null)
  const previewRef = useRef<DragPreview | null>(null)
  const frameRef = useRef<number | null>(null)

  const toGrid = useCallback(
    (clientX: number, clientY: number) => {
      const el = columnsRef.current
      if (!el) return { day: 0, minute: 0 }
      const rect = el.getBoundingClientRect()
      const day = clamp(
        Math.floor(((clientX - rect.left) / rect.width) * DAYS_PER_WEEK),
        0,
        DAYS_PER_WEEK - 1,
      )
      const minute = clamp(pxToMinutes(clientY - rect.top), 0, MINUTES_PER_DAY)
      return { day, minute }
    },
    [columnsRef],
  )

  const timingFor = useCallback(
    (s: Session, clientX: number, clientY: number): BlockTiming => {
      const { day, minute } = toGrid(clientX, clientY)
      const { origin } = s

      switch (s.kind) {
        case 'create': {
          const anchor = origin.start
          if (minute >= anchor) {
            const end = clamp(snapCeil(minute), anchor + MIN_DURATION, MINUTES_PER_DAY)
            return { day: origin.day, start: anchor, end }
          }
          return { day: origin.day, start: snapFloor(minute), end: anchor + MIN_DURATION }
        }
        case 'move': {
          const duration = origin.end - origin.start
          const start = clamp(snapRound(minute - s.grabOffset), 0, MINUTES_PER_DAY - duration)
          return { day, start, end: start + duration }
        }
        case 'resize-top': {
          const start = clamp(snapRound(minute - s.grabOffset), 0, origin.end - MIN_DURATION)
          return { day: origin.day, start, end: origin.end }
        }
        case 'resize-bottom': {
          const end = clamp(
            snapRound(minute - s.grabOffset),
            origin.start + MIN_DURATION,
            MINUTES_PER_DAY,
          )
          return { day: origin.day, start: origin.start, end }
        }
      }
    },
    [toGrid],
  )

  const updatePreview = useCallback(
    (s: Session) => {
      const timing = timingFor(s, s.lastX, s.lastY)
      const prev = previewRef.current
      if (prev && sameTiming(prev, timing)) return
      const next: DragPreview = { ...timing, kind: s.kind, blockId: s.blockId }
      previewRef.current = next
      setPreview(next)
    },
    [timingFor],
  )

  /** Scrolls the grid while the pointer is held near its top/bottom edge. */
  const startAutoScroll = useCallback(() => {
    const tick = () => {
      const s = sessionRef.current
      const scroller = scrollRef.current
      if (!s || !s.moved || !scroller) {
        frameRef.current = null
        return
      }
      const rect = scroller.getBoundingClientRect()
      const top = rect.top + (headerRef.current?.offsetHeight ?? 0)
      const bottom = rect.bottom
      let delta = 0
      if (s.lastY < top + AUTOSCROLL_EDGE_PX) {
        delta = -((top + AUTOSCROLL_EDGE_PX - s.lastY) / AUTOSCROLL_EDGE_PX) * AUTOSCROLL_MAX_SPEED
      } else if (s.lastY > bottom - AUTOSCROLL_EDGE_PX) {
        delta = ((s.lastY - (bottom - AUTOSCROLL_EDGE_PX)) / AUTOSCROLL_EDGE_PX) * AUTOSCROLL_MAX_SPEED
      }
      if (delta !== 0) {
        scroller.scrollTop += Math.round(clamp(delta, -AUTOSCROLL_MAX_SPEED, AUTOSCROLL_MAX_SPEED))
      }

      // Also catches wheel scrolling mid-drag.
      if (scroller.scrollTop !== s.lastScrollTop) {
        s.lastScrollTop = scroller.scrollTop
        updatePreview(s)
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [scrollRef, headerRef, updatePreview])

  const endSession = useCallback(() => {
    const s = sessionRef.current
    sessionRef.current = null
    previewRef.current = null
    setPreview(null)
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    const el = columnsRef.current
    if (s && el?.hasPointerCapture(s.pointerId)) el.releasePointerCapture(s.pointerId)
  }, [columnsRef])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || sessionRef.current) return
      if (!(e.target instanceof Element)) return

      const { day, minute } = toGrid(e.clientX, e.clientY)
      const blockEl = e.target.closest<HTMLElement>('[data-block-id]')
      const handle = e.target.closest<HTMLElement>('[data-resize]')?.dataset.resize

      let session: Session
      const base = {
        pointerId: e.pointerId,
        downX: e.clientX,
        downY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        lastScrollTop: scrollRef.current?.scrollTop ?? 0,
        moved: false,
      }

      if (blockEl?.dataset.blockId) {
        const block = getBlock(blockEl.dataset.blockId)
        if (!block) return
        const kind: DragKind =
          handle === 'top' ? 'resize-top' : handle === 'bottom' ? 'resize-bottom' : 'move'
        session = {
          ...base,
          kind,
          blockId: block.id,
          origin: { day: block.day, start: block.start, end: block.end },
          grabOffset: kind === 'resize-bottom' ? minute - block.end : minute - block.start,
        }
        e.preventDefault()
      } else {
        const start = Math.min(snapFloor(minute), MINUTES_PER_DAY - MIN_DURATION)
        session = {
          ...base,
          kind: 'create',
          blockId: null,
          origin: { day, start, end: start + MIN_DURATION },
          grabOffset: 0,
        }
        // Let touch users scroll the grid; a tap still creates a block.
        if (e.pointerType !== 'touch') e.preventDefault()
      }

      sessionRef.current = session
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [toGrid, getBlock, scrollRef],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = sessionRef.current
      if (!s || e.pointerId !== s.pointerId) return
      s.lastX = e.clientX
      s.lastY = e.clientY

      if (!s.moved) {
        if (Math.hypot(e.clientX - s.downX, e.clientY - s.downY) < DRAG_THRESHOLD_PX) return
        s.moved = true
        document.body.style.cursor = CURSORS[s.kind]
        document.body.style.userSelect = 'none'
        startAutoScroll()
      }
      updatePreview(s)
    },
    [startAutoScroll, updatePreview],
  )

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = sessionRef.current
      if (!s || e.pointerId !== s.pointerId) return
      const timing = s.moved ? timingFor(s, e.clientX, e.clientY) : null
      endSession()

      if (!timing) {
        // A click, not a drag.
        if (s.blockId) {
          onBlockClick(s.blockId)
        } else {
          const start = Math.min(s.origin.start, MINUTES_PER_DAY - DEFAULT_DURATION)
          onCreate({ day: s.origin.day, start, end: start + DEFAULT_DURATION })
        }
        return
      }

      if (s.kind === 'create') onCreate(timing)
      else if (s.blockId && !sameTiming(timing, s.origin)) onCommit(s.blockId, timing)
    },
    [timingFor, endSession, onBlockClick, onCreate, onCommit],
  )

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (sessionRef.current?.pointerId === e.pointerId) endSession()
    },
    [endSession],
  )

  // Escape cancels an in-progress drag.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sessionRef.current) {
        e.stopPropagation()
        endSession()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [endSession])

  useEffect(() => endSession, [endSession])

  return {
    preview,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  }
}
