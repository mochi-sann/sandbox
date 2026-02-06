import { Vector3 } from 'three'
import type { WorldCoord } from '../types'
import { World } from '../world/World'

export interface RaycastHit {
  block: WorldCoord
  previous: WorldCoord
}

export const raycastBlock = (
  world: World,
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
): RaycastHit | null => {
  const step = 0.05
  const cursor = origin.clone()
  let previousCell: WorldCoord = {
    x: Math.floor(cursor.x),
    y: Math.floor(cursor.y),
    z: Math.floor(cursor.z),
  }

  const ray = direction.clone().normalize().multiplyScalar(step)

  for (let traveled = 0; traveled <= maxDistance; traveled += step) {
    cursor.add(ray)
    const currentCell: WorldCoord = {
      x: Math.floor(cursor.x),
      y: Math.floor(cursor.y),
      z: Math.floor(cursor.z),
    }

    if (
      currentCell.x !== previousCell.x ||
      currentCell.y !== previousCell.y ||
      currentCell.z !== previousCell.z
    ) {
      if (world.getBlock(currentCell.x, currentCell.y, currentCell.z) !== 0) {
        return {
          block: currentCell,
          previous: previousCell,
        }
      }
      previousCell = currentCell
    }
  }

  return null
}
