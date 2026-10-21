import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Block, BlockDraft } from '@/types'
import { isRecord, newId, SCHEMA_VERSION, validateBlock } from '@/lib/io'

interface PersistedSlice {
  blocks: Block[]
}

interface TimeblockState extends PersistedSlice {
  selectedId: string | null
  add: (draft: BlockDraft) => Block
  update: (id: string, patch: Partial<BlockDraft>) => void
  remove: (id: string) => Block | undefined
  /** Puts previously removed blocks back (used by Undo). */
  restore: (blocks: readonly Block[]) => void
  replaceAll: (blocks: readonly Block[]) => void
  /** Adds blocks with fresh ids so they never collide with existing ones. */
  merge: (blocks: readonly Block[]) => void
  clear: () => void
  select: (id: string | null) => void
}

const withFreshIds = (blocks: readonly Block[]): Block[] =>
  blocks.map((b) => ({ ...b, id: newId() }))

export const useTimeblockStore = create<TimeblockState>()(
  persist(
    (set, get) => ({
      blocks: [],
      selectedId: null,

      add: (draft) => {
        const block: Block = { ...draft, id: newId() }
        set((s) => ({ blocks: [...s.blocks, block] }))
        return block
      },

      update: (id, patch) =>
        set((s) => ({ blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),

      remove: (id) => {
        const block = get().blocks.find((b) => b.id === id)
        if (!block) return undefined
        set((s) => ({
          blocks: s.blocks.filter((b) => b.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        }))
        return block
      },

      restore: (blocks) =>
        set((s) => {
          const existing = new Set(s.blocks.map((b) => b.id))
          return { blocks: [...s.blocks, ...blocks.filter((b) => !existing.has(b.id))] }
        }),

      replaceAll: (blocks) => set({ blocks: withFreshIds(blocks), selectedId: null }),

      merge: (blocks) => set((s) => ({ blocks: [...s.blocks, ...withFreshIds(blocks)] })),

      clear: () => set({ blocks: [], selectedId: null }),

      select: (id) => set({ selectedId: id }),
    }),
    {
      name: 'timeblocker-v1',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedSlice => ({ blocks: s.blocks }),
      migrate: (persisted) => persisted as PersistedSlice,
      // Drop anything malformed that may have ended up in localStorage.
      merge: (persisted, current) => {
        const raw = isRecord(persisted) && Array.isArray(persisted.blocks) ? persisted.blocks : []
        const blocks = raw
          .map((b: unknown) => validateBlock(b))
          .filter((b): b is Block => b !== null)
        return { ...current, blocks }
      },
    },
  ),
)
