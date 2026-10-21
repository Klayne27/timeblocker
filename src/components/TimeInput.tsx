import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { formatTime, parseTimeInput } from '@/lib/time'
import { cn } from '@/lib/utils'

interface TimeInputProps {
  label: string
  value: number
  /** Times offered in the dropdown. */
  options: readonly number[]
  /** Extra text after an option, e.g. a duration. */
  describeOption?: (minutes: number) => string
  /** Treat midnight as 24:00 (for end times). */
  endOfDay?: boolean
  /** Applies a new time. Returns an error message to reject it, or null. */
  onCommit: (minutes: number) => string | null
  /** Reports a problem to show (or null to clear it). */
  onError: (message: string | null) => void
}

/**
 * A time field you can type into ("10", "930", "1735", "5:35pm") or pick
 * from a list. Arrow keys step through the list.
 */
export function TimeInput({
  label,
  value,
  options,
  describeOption,
  endOfDay = false,
  onCommit,
  onError,
}: TimeInputProps) {
  const [text, setText] = useState(formatTime(value))
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const setError = (message: string | null) => {
    setInvalid(message !== null)
    onError(message)
  }
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const formatted = formatTime(value)
  const shownText = editing ? text : formatted
  const parsed = editing && text !== formatted ? parseTimeInput(text, { endOfDay }) : null
  const typedSomething = editing && text.trim() !== '' && text !== formatted

  // The option to highlight: the typed time if it reads, otherwise the current value.
  const focusTime = parsed ?? value
  const nearest = options.reduce<number | null>(
    (best, m) => (best === null || Math.abs(m - focusTime) < Math.abs(best - focusTime) ? m : best),
    null,
  )

  useEffect(() => {
    if (!open || nearest === null) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-minutes="${nearest}"]`)
    el?.scrollIntoView({ block: 'center' })
  }, [open, nearest])

  const apply = (minutes: number): boolean => {
    const problem = onCommit(minutes)
    setError(problem)
    setText(problem ? formatted : formatTime(minutes))
    return problem === null
  }

  /** Reads the typed text. Returns false if it couldn't be used. */
  const commitText = (): boolean => {
    if (text.trim() === '' || text === formatted) {
      setText(formatted)
      return true
    }
    const minutes = parseTimeInput(text, { endOfDay })
    if (minutes === null) {
      setError(`Couldn't read “${text.trim()}”. Try 10, 930, 17:35 or 5:35pm.`)
      setText(formatted)
      return false
    }
    return apply(minutes)
  }

  const step = (direction: 1 | -1) => {
    const next =
      direction === 1 ? options.find((m) => m > value) : [...options].reverse().find((m) => m < value)
    if (next !== undefined) apply(next)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Enter sets the time; it doesn't submit the form.
      e.preventDefault()
      commitText()
      setOpen(false)
      requestAnimationFrame(() => inputRef.current?.select())
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      step(e.key === 'ArrowDown' ? 1 : -1)
      requestAnimationFrame(() => inputRef.current?.select())
    } else if (e.key === 'Escape' && open) {
      // Close the list first; a second Escape closes the dialog.
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      setText(formatted)
    }
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <Input
            ref={inputRef}
            aria-label={label}
            aria-invalid={invalid}
            autoComplete="off"
            spellCheck={false}
            value={shownText}
            onFocus={(e) => {
              setEditing(true)
              setText(formatted)
              setError(null)
              setOpen(true)
              e.currentTarget.select()
            }}
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
              setOpen(true)
            }}
            onBlur={() => {
              commitText()
              setEditing(false)
              setOpen(false)
            }}
            onKeyDown={onKeyDown}
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-44 gap-0 p-1"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (e.target === inputRef.current) e.preventDefault()
          }}
        >
          {typedSomething && (
            <div
              className={cn(
                'mb-1 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm',
                parsed !== null ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'text-muted-foreground',
              )}
            >
              {parsed !== null ? (
                <>
                  <span className="font-medium">{formatTime(parsed)}</span>
                  <CornerDownLeft className="size-3.5" />
                </>
              ) : (
                <span className="text-xs">Try 10, 930, 17:35 or 5:35pm</span>
              )}
            </div>
          )}
          <div ref={listRef} className="max-h-60 overflow-y-auto" role="listbox" aria-label={label}>
            {options.map((m) => (
              <button
                key={m}
                type="button"
                role="option"
                aria-selected={m === value}
                data-minutes={m}
                tabIndex={-1}
                // Keep focus in the input so blur doesn't fire first.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  apply(m)
                  setOpen(false)
                  requestAnimationFrame(() => inputRef.current?.select())
                }}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                  m === value && 'font-medium text-[#1a73e8]',
                  m === nearest && m !== value && 'bg-accent',
                )}
              >
                {formatTime(m)}
                {describeOption && (
                  <span className="text-xs text-muted-foreground">{describeOption(m)}</span>
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
