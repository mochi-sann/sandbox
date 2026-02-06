import { PerspectiveCamera, Vector3 } from 'three'
import { PlayerController } from '../core/PlayerController'
import { World } from '../world/World'

const FORWARD_DISTANCE = 5
const THIRD_PERSON_DISTANCE = 4
const THIRD_PERSON_HEIGHT = 1.8

const forwardFromYawPitch = (yaw: number, pitch: number): Vector3 => {
  const x = Math.sin(yaw) * Math.cos(pitch)
  const y = Math.sin(pitch)
  const z = Math.cos(yaw) * Math.cos(pitch)
  return new Vector3(x, y, z).normalize()
}

const resolveThirdPersonPosition = (world: World, eye: Vector3, desired: Vector3): Vector3 => {
  const direction = desired.clone().sub(eye)
  const maxDistance = direction.length()
  if (maxDistance <= 0.001) {
    return desired
  }

  direction.normalize()
  const step = 0.1
  const cursor = eye.clone()

  for (let traveled = 0; traveled <= maxDistance; traveled += step) {
    cursor.addScaledVector(direction, step)
    const bx = Math.floor(cursor.x)
    const by = Math.floor(cursor.y)
    const bz = Math.floor(cursor.z)
    if (world.getBlock(bx, by, bz) !== 0) {
      return eye.clone().addScaledVector(direction, Math.max(0.4, traveled - 0.3))
    }
  }

  return desired
}

export const updateCameraFromPlayer = (
  camera: PerspectiveCamera,
  player: PlayerController,
  world: World,
): void => {
  const state = player.state
  const eyePosTuple = player.getEyePosition()
  const eye = new Vector3(eyePosTuple[0], eyePosTuple[1], eyePosTuple[2])
  const forward = forwardFromYawPitch(state.yaw, state.pitch)
  const lookTarget = eye.clone().addScaledVector(forward, FORWARD_DISTANCE)

  if (player.getCameraMode() === 'first') {
    camera.position.copy(eye)
    camera.lookAt(lookTarget)
    return
  }

  const backward = forward.clone()
  backward.y = 0
  backward.normalize().multiplyScalar(-THIRD_PERSON_DISTANCE)

  const desired = eye.clone().add(backward)
  desired.y += THIRD_PERSON_HEIGHT

  const resolved = resolveThirdPersonPosition(world, eye, desired)
  camera.position.copy(resolved)
  camera.lookAt(lookTarget)
}
