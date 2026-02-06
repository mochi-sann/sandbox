import type { BlockId, ModifiedBlock } from '../types'
import { CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, Chunk } from './Chunk'
import { TerrainGenerator } from './TerrainGenerator'

const floorDiv = (value: number, divisor: number): number => {
  return Math.floor(value / divisor)
}

const mod = (value: number, divisor: number): number => {
  return ((value % divisor) + divisor) % divisor
}

const keyOfChunk = (cx: number, cz: number): string => `${cx},${cz}`
const keyOfBlock = (x: number, y: number, z: number): string => `${x},${y},${z}`
const parseChunkKey = (key: string): { cx: number; cz: number } => {
  const [cxRaw, czRaw] = key.split(',')
  return { cx: Number(cxRaw), cz: Number(czRaw) }
}

export interface ChunkWithCoord {
  key: string
  cx: number
  cz: number
  chunk: Chunk
}

export class World {
  private readonly chunks = new Map<string, Chunk>()

  private readonly dirtyChunks = new Set<string>()

  private readonly modifiedByChunk = new Map<string, ModifiedBlock[]>()

  private readonly modifiedByCoord = new Map<string, BlockId>()

  private readonly generationQueue: string[] = []

  private readonly generationQueuedSet = new Set<string>()

  public readonly seed: number

  public constructor(seed: number, modifiedBlocks: ModifiedBlock[] = []) {
    this.seed = seed
    for (const entry of modifiedBlocks) {
      this.storeModified(entry)
    }
  }

  public getChunkKey(cx: number, cz: number): string {
    return keyOfChunk(cx, cz)
  }

  public getChunkCoordsByWorld(x: number, z: number): { cx: number; cz: number } {
    return {
      cx: floorDiv(x, CHUNK_SIZE_X),
      cz: floorDiv(z, CHUNK_SIZE_Z),
    }
  }

  public ensureChunk(cx: number, cz: number): Chunk {
    const key = keyOfChunk(cx, cz)
    const existing = this.chunks.get(key)
    if (existing) {
      return existing
    }

    const chunk = TerrainGenerator.generateChunk(cx, cz, this.seed)
    const mods = this.modifiedByChunk.get(key)
    if (mods) {
      for (const modEntry of mods) {
        if (modEntry.y < 0 || modEntry.y >= CHUNK_SIZE_Y) {
          continue
        }

        const lx = mod(modEntry.x, CHUNK_SIZE_X)
        const lz = mod(modEntry.z, CHUNK_SIZE_Z)
        chunk.set(lx, modEntry.y, lz, modEntry.blockId)
      }
    }

    this.chunks.set(key, chunk)
    this.dirtyChunks.add(key)
    this.generationQueuedSet.delete(key)
    this.markChunkDirty(cx - 1, cz)
    this.markChunkDirty(cx + 1, cz)
    this.markChunkDirty(cx, cz - 1)
    this.markChunkDirty(cx, cz + 1)
    return chunk
  }

  public isChunkLoaded(cx: number, cz: number): boolean {
    return this.chunks.has(keyOfChunk(cx, cz))
  }

  public markChunkDirty(cx: number, cz: number): void {
    const key = keyOfChunk(cx, cz)
    if (this.chunks.has(key)) {
      this.dirtyChunks.add(key)
    }
  }

  public enqueueChunkGeneration(cx: number, cz: number): void {
    const key = keyOfChunk(cx, cz)
    if (this.chunks.has(key) || this.generationQueuedSet.has(key)) {
      return
    }
    this.generationQueuedSet.add(key)
    this.generationQueue.push(key)
  }

  public enqueueChunkGenerationByWorld(x: number, z: number): void {
    const { cx, cz } = this.getChunkCoordsByWorld(x, z)
    this.enqueueChunkGeneration(cx, cz)
  }

  public drainChunkGenerationBudget(maxChunks: number): number {
    let generated = 0
    while (generated < maxChunks && this.generationQueue.length > 0) {
      const key = this.generationQueue.shift()
      if (!key) {
        break
      }

      const { cx, cz } = parseChunkKey(key)
      this.ensureChunk(cx, cz)
      generated += 1
    }

    return generated
  }

  public getBlock(x: number, y: number, z: number): BlockId {
    if (y < 0 || y >= CHUNK_SIZE_Y) {
      return 0
    }

    const { cx, cz } = this.getChunkCoordsByWorld(x, z)
    const chunk = this.ensureChunk(cx, cz)
    const lx = mod(x, CHUNK_SIZE_X)
    const lz = mod(z, CHUNK_SIZE_Z)
    return chunk.get(lx, y, lz)
  }

  public peekBlock(x: number, y: number, z: number): BlockId | undefined {
    if (y < 0 || y >= CHUNK_SIZE_Y) {
      return 0
    }

    const { cx, cz } = this.getChunkCoordsByWorld(x, z)
    const chunk = this.chunks.get(keyOfChunk(cx, cz))
    if (!chunk) {
      return undefined
    }

    const lx = mod(x, CHUNK_SIZE_X)
    const lz = mod(z, CHUNK_SIZE_Z)
    return chunk.get(lx, y, lz)
  }

  public setBlock(x: number, y: number, z: number, blockId: BlockId, trackModification: boolean): void {
    if (y < 0 || y >= CHUNK_SIZE_Y) {
      return
    }

    const { cx, cz } = this.getChunkCoordsByWorld(x, z)
    const chunk = this.ensureChunk(cx, cz)
    const lx = mod(x, CHUNK_SIZE_X)
    const lz = mod(z, CHUNK_SIZE_Z)

    if (chunk.get(lx, y, lz) === blockId) {
      return
    }

    chunk.set(lx, y, lz, blockId)
    this.markChunkAndNeighborsDirty(cx, cz, lx, lz)

    if (trackModification) {
      this.storeModified({ x, y, z, blockId })
    }
  }

  public collectDirtyChunkCoords(maxCount?: number): Array<{ key: string; cx: number; cz: number }> {
    const values: Array<{ key: string; cx: number; cz: number }> = []
    const limit = maxCount ?? Number.POSITIVE_INFINITY
    const keys = Array.from(this.dirtyChunks)
    for (let index = 0; index < keys.length && index < limit; index += 1) {
      const key = keys[index]
      const { cx, cz } = parseChunkKey(key)
      values.push({ key, cx, cz })
      this.dirtyChunks.delete(key)
    }
    return values
  }

  public getLoadedChunks(): ChunkWithCoord[] {
    const entries: ChunkWithCoord[] = []
    for (const [key, chunk] of this.chunks.entries()) {
      const { cx, cz } = parseChunkKey(key)
      entries.push({ key, cx, cz, chunk })
    }
    return entries
  }

  public getModifiedBlocks(): ModifiedBlock[] {
    const entries: ModifiedBlock[] = []
    for (const [coordKey, blockId] of this.modifiedByCoord.entries()) {
      const [xRaw, yRaw, zRaw] = coordKey.split(',')
      entries.push({ x: Number(xRaw), y: Number(yRaw), z: Number(zRaw), blockId })
    }
    return entries
  }

  public pruneFarChunks(originX: number, originZ: number, keepRadiusInChunks: number): string[] {
    const center = this.getChunkCoordsByWorld(originX, originZ)
    const removed: string[] = []

    for (const key of this.chunks.keys()) {
      const { cx, cz } = parseChunkKey(key)

      if (Math.abs(cx - center.cx) > keepRadiusInChunks || Math.abs(cz - center.cz) > keepRadiusInChunks) {
        this.chunks.delete(key)
        this.dirtyChunks.delete(key)
        removed.push(key)
      }
    }

    this.dedupeAndKeepNearbyQueue(center.cx, center.cz, keepRadiusInChunks)

    return removed
  }

  private markChunkAndNeighborsDirty(cx: number, cz: number, lx: number, lz: number): void {
    this.dirtyChunks.add(keyOfChunk(cx, cz))

    if (lx === 0) {
      this.dirtyChunks.add(keyOfChunk(cx - 1, cz))
    }
    if (lx === CHUNK_SIZE_X - 1) {
      this.dirtyChunks.add(keyOfChunk(cx + 1, cz))
    }
    if (lz === 0) {
      this.dirtyChunks.add(keyOfChunk(cx, cz - 1))
    }
    if (lz === CHUNK_SIZE_Z - 1) {
      this.dirtyChunks.add(keyOfChunk(cx, cz + 1))
    }
  }

  private storeModified(entry: ModifiedBlock): void {
    const coordKey = keyOfBlock(entry.x, entry.y, entry.z)
    this.modifiedByCoord.set(coordKey, entry.blockId)

    const { cx, cz } = this.getChunkCoordsByWorld(entry.x, entry.z)
    const chunkKey = keyOfChunk(cx, cz)
    const list = this.modifiedByChunk.get(chunkKey) ?? []
    const index = list.findIndex((item) => item.x === entry.x && item.y === entry.y && item.z === entry.z)
    if (index >= 0) {
      list[index] = entry
    } else {
      list.push(entry)
    }
    this.modifiedByChunk.set(chunkKey, list)
  }

  private dedupeAndKeepNearbyQueue(centerCx: number, centerCz: number, keepRadiusInChunks: number): void {
    const rebuilt: string[] = []
    const seen = new Set<string>()

    for (const key of this.generationQueue) {
      if (seen.has(key)) {
        continue
      }
      seen.add(key)

      const { cx, cz } = parseChunkKey(key)
      const isFar = Math.abs(cx - centerCx) > keepRadiusInChunks || Math.abs(cz - centerCz) > keepRadiusInChunks
      if (isFar || this.chunks.has(key)) {
        this.generationQueuedSet.delete(key)
        continue
      }

      rebuilt.push(key)
    }

    this.generationQueue.length = 0
    this.generationQueue.push(...rebuilt)
  }
}
