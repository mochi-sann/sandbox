import type { BlockId } from '../types'

export const CHUNK_SIZE_X = 16
export const CHUNK_SIZE_Y = 128
export const CHUNK_SIZE_Z = 16

export class Chunk {
  public readonly blocks: Uint8Array

  public constructor() {
    this.blocks = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z)
  }

  public get(lx: number, y: number, lz: number): BlockId {
    return this.blocks[this.index(lx, y, lz)] as BlockId
  }

  public set(lx: number, y: number, lz: number, blockId: BlockId): void {
    this.blocks[this.index(lx, y, lz)] = blockId
  }

  private index(lx: number, y: number, lz: number): number {
    return lx + lz * CHUNK_SIZE_X + y * CHUNK_SIZE_X * CHUNK_SIZE_Z
  }
}
