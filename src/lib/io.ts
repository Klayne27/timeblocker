import type { Block } from '@/types'
import { normalizeHex } from '@/lib/colors'
import { DAYS_PER_WEEK, MINUTES_PER_DAY } from '@/lib/time'

export const SCHEMA_VERSION = 1

export interface ExportFile {
  version: number
  exportedAt: string
  blocks: Block[]
}

export type ImportResult =
  | { ok: true; blocks: Block[]; skipped: number }
  | { ok: false; error: string }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)

/** Returns a clean Block, or null if the value isn't a valid block. */
export function validateBlock(raw: unknown): Block | null {
  if (!isRecord(raw)) return null
  const { id, title, description, day, start, end, color } = raw

  if (typeof id !== 'string' || id.length === 0) return null
  if (typeof title !== 'string') return null
  if (description !== undefined && typeof description !== 'string') return null
  if (!isInt(day) || day < 0 || day >= DAYS_PER_WEEK) return null
  if (!isInt(start) || !isInt(end)) return null
  if (start < 0 || end > MINUTES_PER_DAY || start >= end) return null
  if (typeof color !== 'string') return null
  const hex = normalizeHex(color)
  if (!hex || !color.trim().startsWith('#')) return null

  return { id, title, description: description ?? '', day, start, end, color: hex }
}

/** Parses and validates the text of an exported backup file. */
export function parseImport(text: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' }
  }

  // Accept the export format, or a bare array of blocks.
  let rawBlocks: unknown
  if (Array.isArray(data)) {
    rawBlocks = data
  } else if (isRecord(data)) {
    if (data.version !== undefined && typeof data.version !== 'number') {
      return { ok: false, error: '"version" must be a number.' }
    }
    if (typeof data.version === 'number' && data.version > SCHEMA_VERSION) {
      return {
        ok: false,
        error: `This file uses schema version ${data.version}, but this app only supports up to version ${SCHEMA_VERSION}.`,
      }
    }
    rawBlocks = data.blocks
  }

  if (!Array.isArray(rawBlocks)) {
    return { ok: false, error: 'No "blocks" array found in the file.' }
  }

  const blocks: Block[] = []
  for (const raw of rawBlocks) {
    const block = validateBlock(raw)
    if (block) blocks.push(block)
  }
  const skipped = rawBlocks.length - blocks.length

  if (blocks.length === 0) {
    return {
      ok: false,
      error:
        rawBlocks.length === 0
          ? 'The file contains no blocks.'
          : `None of the ${rawBlocks.length} blocks in the file are valid.`,
    }
  }

  return { ok: true, blocks, skipped }
}

function localDateStamp(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function buildExport(blocks: readonly Block[], now = new Date()): ExportFile {
  return { version: SCHEMA_VERSION, exportedAt: now.toISOString(), blocks: [...blocks] }
}

/** Triggers a download of timeblocker-backup-YYYY-MM-DD.json. */
export function downloadExport(blocks: readonly Block[]): void {
  const now = new Date()
  const json = JSON.stringify(buildExport(blocks, now), null, 2)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `timeblocker-backup-${localDateStamp(now)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function newId(): string {
  return crypto.randomUUID()
}
