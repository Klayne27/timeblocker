export const HOUR_HEIGHT = 48
export const MINUTES_PER_DAY = 1440
export const SNAP_MINUTES = 15
export const MIN_DURATION = 15
export const DEFAULT_DURATION = 60
export const DAYS_PER_WEEK = 7
export const GRID_HEIGHT = 24 * HOUR_HEIGHT
export const INITIAL_SCROLL_HOUR = 7

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

/** Every 15-minute mark from 00:00 to 24:00 inclusive. */
export const TIME_OPTIONS: readonly number[] = Array.from(
  { length: MINUTES_PER_DAY / SNAP_MINUTES + 1 },
  (_, i) => i * SNAP_MINUTES,
)

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function minutesToPx(minutes: number): number {
  return (minutes / 60) * HOUR_HEIGHT
}

export function pxToMinutes(px: number): number {
  return (px / HOUR_HEIGHT) * 60
}

export function snapRound(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
}

export function snapFloor(minutes: number): number {
  return Math.floor(minutes / SNAP_MINUTES) * SNAP_MINUTES
}

export function snapCeil(minutes: number): number {
  return Math.ceil(minutes / SNAP_MINUTES) * SNAP_MINUTES
}

function meridiem(minutes: number): 'AM' | 'PM' {
  return minutes % MINUTES_PER_DAY < 720 ? 'AM' : 'PM'
}

/** 570 → "9:30 AM", 1440 → "12:00 AM". */
export function formatTime(minutes: number, withMeridiem = true): string {
  const total = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const h24 = Math.floor(total / 60)
  const m = total % 60
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const base = `${h12}:${String(m).padStart(2, '0')}`
  return withMeridiem ? `${base} ${meridiem(total)}` : base
}

/** "9:00 – 10:30 AM", or "11:00 AM – 1:00 PM" when the meridiem changes. */
export function formatRange(start: number, end: number): string {
  if (meridiem(start) === meridiem(end) && end - start < 720) {
    return `${formatTime(start, false)} – ${formatTime(end)}`
  }
  return `${formatTime(start)} – ${formatTime(end)}`
}

/** 7 → "7 AM", 12 → "12 PM", 0 → "12 AM". */
export function formatHourLabel(hour: number): string {
  const h = hour % 24
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

/** 45 → "45 mins", 60 → "1 hr", 90 → "1.5 hrs", 75 → "1 hr 15 mins". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} mins`
  if (m === 0) return `${h} ${h === 1 ? 'hr' : 'hrs'}`
  if (m === 30) return `${h}.5 hrs`
  return `${h} ${h === 1 ? 'hr' : 'hrs'} ${m} mins`
}

/**
 * Reads a typed time and returns minutes from midnight, or null.
 *
 * Without am/pm, numbers are read as a 24-hour clock:
 *   "10" → 10:00, "930" → 9:30, "1735" → 17:35, "17:35" / "17.35" → 17:35
 * With am/pm (also "a"/"p"): "5pm" → 17:00, "5:35 pm" → 17:35, "12am" → 0:00
 * Words: "noon", "midnight".
 *
 * Pass `endOfDay` for an end time, so midnight means 24:00 instead of 0:00.
 */
export function parseTimeInput(input: string, { endOfDay = false } = {}): number | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, '')
  if (text === '') return null

  const finish = (minutes: number) => (endOfDay && minutes === 0 ? MINUTES_PER_DAY : minutes)

  if (text === 'noon') return 720
  if (text === 'midnight') return finish(0)

  const match = /^(\d{1,4})(?:[:.h](\d{0,2}))?(a|am|a\.m\.?|p|pm|p\.m\.?)?$/.exec(text)
  if (!match) return null
  const [, digits, minutePart, suffix] = match

  let hours: number
  let minutes: number
  if (minutePart !== undefined) {
    // "17:35", "9.30", "10:"
    if (digits.length > 2) return null
    hours = Number(digits)
    minutes = minutePart === '' ? 0 : Number(minutePart)
    if (minutePart.length === 1) minutes *= 10 // "9:3" → 9:30
  } else if (digits.length <= 2) {
    hours = Number(digits) // "10"
    minutes = 0
  } else {
    // "930" → 9:30, "1735" → 17:35
    hours = Number(digits.slice(0, -2))
    minutes = Number(digits.slice(-2))
  }
  if (minutes > 59) return null

  if (suffix) {
    const pm = suffix.startsWith('p')
    if (hours === 0 || hours > 12) {
      // Accept "17pm" as 17:00, but not "17am" or "0pm".
      if (pm && hours > 12 && hours < 24) return hours * 60 + minutes
      return null
    }
    const h24 = (hours % 12) + (pm ? 12 : 0)
    return finish(h24 * 60 + minutes)
  }

  if (hours === 24 && minutes === 0) return MINUTES_PER_DAY
  if (hours > 23) return null
  return finish(hours * 60 + minutes)
}

/** Today's weekday as 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60
}
