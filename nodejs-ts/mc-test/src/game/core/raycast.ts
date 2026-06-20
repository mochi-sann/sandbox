import { Vector3 } from 'three'
import type { RaycastHit, WorldCoord } from '../types'
import type { World } from '../world/World'

export const raycastBlock = (
  world: World,
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
): RaycastHit | null => {
  const dirX = direction.x
  const dirY = direction.y
  const dirZ = direction.z
  const len = Math.hypot(dirX, dirY, dirZ) || 1
  const dx = dirX / len
  const dy = dirY / len
  const dz = dirZ / len

  let x = Math.floor(origin.x)
  let y = Math.floor(origin.y)
  let z = Math.floor(origin.z)

  const stepX = dx > 0 ? 1 : -1
  const stepY = dy > 0 ? 1 : -1
  const stepZ = dz > 0 ? 1 : -1

  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Number.POSITIVE_INFINITY
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Number.POSITIVE_INFINITY
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Number.POSITIVE_INFINITY

  let tMaxX = dx > 0 ? (x + 1 - origin.x) / dx : dx < 0 ? (origin.x - x) / -dx : Number.POSITIVE_INFINITY
  let tMaxY = dy > 0 ? (y + 1 - origin.y) / dy : dy < 0 ? (origin.y - y) / -dy : Number.POSITIVE_INFINITY
  let tMaxZ = dz > 0 ? (z + 1 - origin.z) / dz : dz < 0 ? (origin.z - z) / -dz : Number.POSITIVE_INFINITY

  let previous: WorldCoord = { x, y, z }
  let lastAxis: 'x' | 'y' | 'z' | null = null

  for (;;) {
    if (world.getBlock(x, y, z) !== 0) {
      const normal: [number, number, number] =
        lastAxis === 'x' ? [-stepX, 0, 0]
        : lastAxis === 'y' ? [0, -stepY, 0]
        : lastAxis === 'z' ? [0, 0, -stepZ]
        : [0, 0, 0]
      return { block: { x, y, z }, previous, normal }
    }
    previous = { x, y, z }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        if (tMaxX > maxDistance) {
          return null
        }
        x += stepX
        tMaxX += tDeltaX
        lastAxis = 'x'
      } else {
        if (tMaxZ > maxDistance) {
          return null
        }
        z += stepZ
        tMaxZ += tDeltaZ
        lastAxis = 'z'
      }
    } else {
      if (tMaxY < tMaxZ) {
        if (tMaxY > maxDistance) {
          return null
        }
        y += stepY
        tMaxY += tDeltaY
        lastAxis = 'y'
      } else {
        if (tMaxZ > maxDistance) {
          return null
        }
        z += stepZ
        tMaxZ += tDeltaZ
        lastAxis = 'z'
      }
    }
  }
}
