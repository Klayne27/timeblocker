export interface PaletteColor {
  name: string
  hex: string
}

/** Google Calendar-style event colors (lowercase hex). */
export const PALETTE: readonly PaletteColor[] = [
  { name: 'Tomato', hex: '#d50000' },
  { name: 'Flamingo', hex: '#e67c73' },
  { name: 'Tangerine', hex: '#f4511e' },
  { name: 'Banana', hex: '#f6bf26' },
  { name: 'Sage', hex: '#33b679' },
  { name: 'Basil', hex: '#0b8043' },
  { name: 'Peacock', hex: '#039be5' },
  { name: 'Blueberry', hex: '#3f51b5' },
  { name: 'Lavender', hex: '#7986cb' },
  { name: 'Grape', hex: '#8e24aa' },
  { name: 'Cocoa', hex: '#795548' },
  { name: 'Graphite', hex: '#616161' },
]

/** Order new blocks pick colors in, so consecutive blocks look distinct. */
const DEFAULT_ORDER = [
  'Peacock',
  'Tomato',
  'Sage',
  'Banana',
  'Grape',
  'Tangerine',
  'Blueberry',
  'Flamingo',
  'Basil',
  'Lavender',
  'Cocoa',
  'Graphite',
].map((name) => PALETTE.find((c) => c.name === name)?.hex ?? '#039be5')

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value.trim()) && value.trim().startsWith('#')
}

/** "#ABC" / "abc" / "#aabbcc" → "#aabbcc"; anything else → null. */
export function normalizeHex(value: string): string | null {
  const match = HEX_RE.exec(value.trim())
  if (!match) return null
  let digits = match[1].toLowerCase()
  if (digits.length === 3) {
    digits = digits
      .split('')
      .map((d) => d + d)
      .join('')
  }
  return `#${digits}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex) ?? '#000000'
  const n = parseInt(normalized.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** Dark or light text, whichever reads better on the given background. */
export function contrastText(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 150 ? '#1f1f1f' : '#ffffff'
}

export function colorName(hex: string): string {
  const normalized = normalizeHex(hex)
  return PALETTE.find((c) => c.hex === normalized)?.name ?? 'Custom'
}

export function isPaletteColor(hex: string): boolean {
  const normalized = normalizeHex(hex)
  return PALETTE.some((c) => c.hex === normalized)
}

/** First palette color not used yet; if all are used, the least used one. */
export function nextColor(usedColors: readonly string[]): string {
  const counts = new Map<string, number>()
  for (const c of usedColors) {
    const key = normalizeHex(c)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let best = DEFAULT_ORDER[0]
  let bestCount = Infinity
  for (const hex of DEFAULT_ORDER) {
    const count = counts.get(hex) ?? 0
    if (count < bestCount) {
      best = hex
      bestCount = count
    }
  }
  return best
}
