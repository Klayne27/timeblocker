/** Horizontal placement of a block inside its day column, as fractions (0–1). */
export interface BlockLayout {
  left: number
  width: number
}

export const FULL_WIDTH: BlockLayout = { left: 0, width: 1 }

interface Span {
  id: string
  start: number
  end: number
}

const overlaps = (a: Span, b: Span): boolean => a.start < b.end && b.start < a.end

/**
 * Google Calendar-style overlap layout for one day.
 *
 * Blocks that overlap (directly or through a chain) form a cluster. Each block
 * in a cluster takes the first column that is free at its start time, and the
 * cluster's width is split evenly between its columns. A block then stretches
 * right across any neighbouring columns it doesn't collide with.
 */
export function computeDayLayout(blocks: readonly Span[]): Map<string, BlockLayout> {
  const sorted = [...blocks].sort(
    (a, b) => a.start - b.start || b.end - a.end || a.id.localeCompare(b.id),
  )
  const result = new Map<string, BlockLayout>()

  let cluster: Span[] = []
  let clusterEnd = -Infinity
  for (const block of sorted) {
    if (cluster.length > 0 && block.start >= clusterEnd) {
      layoutCluster(cluster, result)
      cluster = []
      clusterEnd = -Infinity
    }
    cluster.push(block)
    clusterEnd = Math.max(clusterEnd, block.end)
  }
  layoutCluster(cluster, result)

  return result
}

function layoutCluster(cluster: Span[], out: Map<string, BlockLayout>): void {
  if (cluster.length === 0) return

  const columns: Span[][] = []
  const placed: { span: Span; column: number }[] = []

  for (const span of cluster) {
    let column = columns.findIndex((col) => col[col.length - 1].end <= span.start)
    if (column === -1) {
      column = columns.length
      columns.push([])
    }
    columns[column].push(span)
    placed.push({ span, column })
  }

  const count = columns.length
  for (const { span, column } of placed) {
    let reach = 1
    for (let c = column + 1; c < count; c++) {
      if (columns[c].some((other) => overlaps(other, span))) break
      reach++
    }
    out.set(span.id, { left: column / count, width: reach / count })
  }
}
