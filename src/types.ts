/** A recurring weekly time block. */
export interface Block {
  id: string
  title: string
  description: string
  /** 0 = Monday … 6 = Sunday */
  day: number
  /** Minutes from midnight, 0–1440 */
  start: number
  /** Minutes from midnight, 0–1440, always > start */
  end: number
  /** Hex color, e.g. "#039be5" */
  color: string
}

/** The position of a block in the week. */
export type BlockTiming = Pick<Block, 'day' | 'start' | 'end'>

export type BlockDraft = Omit<Block, 'id'>
