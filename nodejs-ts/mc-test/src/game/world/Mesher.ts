import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { BlockId } from '../types'
import { CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from '../constants'
import { getBlockColor } from '../registry/blocks'
import { World } from './World'

interface FaceDelta {
  normal: readonly [number, number, number]
  corners: readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]]
}

const FACE_DELTAS: readonly FaceDelta[] = [
  { normal: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { normal: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { normal: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { normal: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { normal: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { normal: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
]

export const buildChunkGeometry = (world: World, cx: number, cz: number): BufferGeometry | null => {
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []

  const baseX = cx * CHUNK_SIZE_X
  const baseZ = cz * CHUNK_SIZE_Z

  const chunk = world.peekChunk(cx, cz)
  const maxY = chunk ? chunk.highestY + 1 : CHUNK_SIZE_Y

  for (let y = 0; y < maxY; y += 1) {
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz += 1) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx += 1) {
        const wx = baseX + lx
        const wz = baseZ + lz
        const blockId = world.peekBlock(wx, y, wz)
        if (blockId === 0 || blockId === undefined) {
          continue
        }

        const [r, g, b] = getBlockColor(blockId as BlockId)

        for (const face of FACE_DELTAS) {
          const nx = face.normal[0]
          const ny = face.normal[1]
          const nz = face.normal[2]
          const neighbor = world.peekBlock(wx + nx, y + ny, wz + nz)
          if (neighbor === undefined) {
            world.enqueueChunkGenerationByWorld(wx + nx, wz + nz)
            continue
          }
          if (neighbor !== 0) {
            continue
          }

          const c0 = face.corners[0]
          const c1 = face.corners[1]
          const c2 = face.corners[2]
          const c3 = face.corners[3]

          positions.push(
            wx + c0[0], y + c0[1], wz + c0[2],
            wx + c1[0], y + c1[1], wz + c1[2],
            wx + c2[0], y + c2[1], wz + c2[2],
            wx + c0[0], y + c0[1], wz + c0[2],
            wx + c2[0], y + c2[1], wz + c2[2],
            wx + c3[0], y + c3[1], wz + c3[2],
          )

          for (let i = 0; i < 6; i += 1) {
            normals.push(nx, ny, nz)
            colors.push(r, g, b)
          }
        }
      }
    }
  }

  if (positions.length === 0) {
    return null
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeBoundingSphere()
  return geometry
}
