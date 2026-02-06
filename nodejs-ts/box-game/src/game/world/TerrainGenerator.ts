import type { BlockId } from '../types'
import { CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, Chunk } from './Chunk'

const BASE_HEIGHT = 40
const HEIGHT_AMPLITUDE = 24

const fract = (value: number): number => value - Math.floor(value)

const hash2 = (x: number, z: number, seed: number): number => {
  const value = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453
  return fract(value)
}

const smoothstep = (t: number): number => t * t * (3 - 2 * t)

const valueNoise2 = (x: number, z: number, seed: number): number => {
  const x0 = Math.floor(x)
  const z0 = Math.floor(z)
  const tx = x - x0
  const tz = z - z0

  const v00 = hash2(x0, z0, seed)
  const v10 = hash2(x0 + 1, z0, seed)
  const v01 = hash2(x0, z0 + 1, seed)
  const v11 = hash2(x0 + 1, z0 + 1, seed)

  const sx = smoothstep(tx)
  const sz = smoothstep(tz)

  const ix0 = v00 * (1 - sx) + v10 * sx
  const ix1 = v01 * (1 - sx) + v11 * sx
  return ix0 * (1 - sz) + ix1 * sz
}

const fbm = (x: number, z: number, seed: number): number => {
  let amplitude = 1
  let frequency = 1
  let total = 0
  let normalization = 0

  for (let octave = 0; octave < 4; octave += 1) {
    total += valueNoise2(x * frequency, z * frequency, seed + octave * 97) * amplitude
    normalization += amplitude
    amplitude *= 0.5
    frequency *= 2
  }

  return total / normalization
}

const pickBlock = (y: number, topY: number): BlockId => {
  if (y === topY) {
    return 1
  }
  if (y >= topY - 2) {
    return 2
  }
  return 3
}

export class TerrainGenerator {
  public static generateChunk(cx: number, cz: number, seed: number): Chunk {
    const chunk = new Chunk()

    for (let lz = 0; lz < CHUNK_SIZE_Z; lz += 1) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx += 1) {
        const wx = cx * CHUNK_SIZE_X + lx
        const wz = cz * CHUNK_SIZE_Z + lz

        const noise = fbm(wx / 64, wz / 64, seed)
        const topY = Math.max(1, Math.min(CHUNK_SIZE_Y - 1, Math.floor(BASE_HEIGHT + noise * HEIGHT_AMPLITUDE)))

        for (let y = 0; y <= topY; y += 1) {
          chunk.set(lx, y, lz, pickBlock(y, topY))
        }
      }
    }

    return chunk
  }
}
