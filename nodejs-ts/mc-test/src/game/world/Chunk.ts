import type { BlockId } from '../types'
import { CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from '../constants'

export class Chunk {
  public readonly blocks: Uint8Array
  public highestY = 0

  public constructor() {
    this.blocks = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z)
  }

  public get(lx: number, y: number, lz: number): BlockId {
    return this.blocks[this.index(lx, y, lz)] as BlockId
  }

  public set(lx: number, y: number, lz: number, blockId: BlockId): void {
    const idx = this.index(lx, y, lz)
    const wasSolid = this.blocks[idx] !== 0
    this.blocks[idx] = blockId
    if (blockId !== 0 && y > this.highestY) {
      this.highestY = y
    } else if (wasSolid && blockId === 0 && y === this.highestY) {
      this.recomputeHighestY()
    }
  }

  private recomputeHighestY(): void {
    let max = 0
    const blocks = this.blocks
    const stride = CHUNK_SIZE_X * CHUNK_SIZE_Z
    for (let y = CHUNK_SIZE_Y - 1; y > 0; y -= 1) {
      const base = y * stride
      for (let i = 0; i < stride; i += 1) {
        if (blocks[base + i] !== 0) {
          max = y
          break
        }
      }
      if (max > 0) {
        break
      }
    }
    this.highestY = max
  }

  private index(lx: number, y: number, lz: number): number {
    return lx + lz * CHUNK_SIZE_X + y * CHUNK_SIZE_X * CHUNK_SIZE_Z
  }
}
