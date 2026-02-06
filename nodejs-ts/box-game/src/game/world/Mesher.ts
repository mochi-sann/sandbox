import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { BlockId } from '../types'
import { CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './Chunk'
import { World } from './World'

const FACE_DELTAS = [
  { normal: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { normal: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { normal: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { normal: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { normal: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { normal: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
] as const

const blockColor = (blockId: BlockId): [number, number, number] => {
  switch (blockId) {
    case 1:
      return [0.40, 0.72, 0.23]
    case 2:
      return [0.48, 0.32, 0.18]
    case 3:
      return [0.48, 0.48, 0.52]
    case 4:
      return [0.62, 0.46, 0.22]
    default:
      return [0, 0, 0]
  }
}

export const buildChunkGeometry = (world: World, cx: number, cz: number): BufferGeometry | null => {
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []

  const baseX = cx * CHUNK_SIZE_X
  const baseZ = cz * CHUNK_SIZE_Z

  for (let y = 0; y < CHUNK_SIZE_Y; y += 1) {
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz += 1) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx += 1) {
        const wx = baseX + lx
        const wz = baseZ + lz
        const blockId = world.peekBlock(wx, y, wz)
        if (blockId === 0) {
          continue
        }
        if (blockId === undefined) {
          continue
        }

        const [r, g, b] = blockColor(blockId)

        for (const face of FACE_DELTAS) {
          const nx = face.normal[0]
          const ny = face.normal[1]
          const nz = face.normal[2]
          const neighborX = wx + nx
          const neighborY = y + ny
          const neighborZ = wz + nz
          const neighbor = world.peekBlock(neighborX, neighborY, neighborZ)
          if (neighbor === undefined) {
            world.enqueueChunkGenerationByWorld(neighborX, neighborZ)
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
