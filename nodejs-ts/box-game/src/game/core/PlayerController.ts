import type { CameraMode, PlayerState } from '../types'
import { CHUNK_SIZE_Y } from '../world/Chunk'
import { World } from '../world/World'
import { InputController } from './InputController'

const PLAYER_WIDTH = 0.6
const PLAYER_HEIGHT = 1.8
const EYE_HEIGHT = 1.62
const WALK_SPEED = 5
const CROUCH_SPEED = 3
const JUMP_SPEED = 6.6
const GRAVITY = 20

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

const isSolid = (world: World, x: number, y: number, z: number): boolean => {
  return world.getBlock(x, y, z) !== 0
}

const overlapsSolid = (world: World, x: number, y: number, z: number): boolean => {
  const halfWidth = PLAYER_WIDTH / 2
  const minX = x - halfWidth
  const maxX = x + halfWidth
  const minY = y
  const maxY = y + PLAYER_HEIGHT
  const minZ = z - halfWidth
  const maxZ = z + halfWidth

  const fromX = Math.floor(minX)
  const toX = Math.floor(maxX - 1e-6)
  const fromY = Math.floor(minY)
  const toY = Math.floor(maxY - 1e-6)
  const fromZ = Math.floor(minZ)
  const toZ = Math.floor(maxZ - 1e-6)

  for (let by = fromY; by <= toY; by += 1) {
    if (by < 0 || by >= CHUNK_SIZE_Y) {
      continue
    }
    for (let bz = fromZ; bz <= toZ; bz += 1) {
      for (let bx = fromX; bx <= toX; bx += 1) {
        if (isSolid(world, bx, by, bz)) {
          return true
        }
      }
    }
  }

  return false
}

const blockIntersectsPlayer = (state: PlayerState, x: number, y: number, z: number): boolean => {
  const halfWidth = PLAYER_WIDTH / 2
  const minX = state.position[0] - halfWidth
  const maxX = state.position[0] + halfWidth
  const minY = state.position[1]
  const maxY = state.position[1] + PLAYER_HEIGHT
  const minZ = state.position[2] - halfWidth
  const maxZ = state.position[2] + halfWidth

  return !(
    x + 1 <= minX ||
    x >= maxX ||
    y + 1 <= minY ||
    y >= maxY ||
    z + 1 <= minZ ||
    z >= maxZ
  )
}

const moveAxis = (
  world: World,
  state: PlayerState,
  axis: 'x' | 'y' | 'z',
  delta: number,
): { moved: number; hit: boolean } => {
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / 0.1))
  const stepDelta = delta / steps
  let moved = 0

  for (let i = 0; i < steps; i += 1) {
    const nextX = axis === 'x' ? state.position[0] + stepDelta : state.position[0]
    const nextY = axis === 'y' ? state.position[1] + stepDelta : state.position[1]
    const nextZ = axis === 'z' ? state.position[2] + stepDelta : state.position[2]

    if (overlapsSolid(world, nextX, nextY, nextZ)) {
      return { moved, hit: true }
    }

    if (axis === 'x') {
      state.position[0] = nextX
    } else if (axis === 'y') {
      state.position[1] = nextY
    } else {
      state.position[2] = nextZ
    }

    moved += stepDelta
  }

  return { moved, hit: false }
}

const applyMovementKeySelection = (input: InputController, state: PlayerState): void => {
  if (input.isPressed('Digit1')) {
    state.selectedBlockId = 1
  }
  if (input.isPressed('Digit2')) {
    state.selectedBlockId = 2
  }
  if (input.isPressed('Digit3')) {
    state.selectedBlockId = 3
  }
  if (input.isPressed('Digit4')) {
    state.selectedBlockId = 4
  }
}

const normalizeYaw = (yaw: number): number => {
  const full = Math.PI * 2
  let value = yaw % full
  if (value < 0) {
    value += full
  }
  return value
}

export class PlayerController {
  public readonly state: PlayerState

  private toggleCameraQueued = false

  public constructor(initialState?: Partial<PlayerState>) {
    this.state = {
      position: initialState?.position ?? [0, 70, 0],
      velocity: initialState?.velocity ?? [0, 0, 0],
      yaw: initialState?.yaw ?? 0,
      pitch: initialState?.pitch ?? 0,
      grounded: initialState?.grounded ?? false,
      cameraMode: initialState?.cameraMode ?? 'first',
      selectedBlockId: initialState?.selectedBlockId ?? 1,
    }
  }

  public update(input: InputController, world: World, dt: number): void {
    applyMovementKeySelection(input, this.state)

    if (input.isPressed('F5')) {
      if (!this.toggleCameraQueued) {
        this.state.cameraMode = this.state.cameraMode === 'first' ? 'third' : 'first'
      }
      this.toggleCameraQueued = true
    } else {
      this.toggleCameraQueued = false
    }

    const { dx, dy } = input.consumeMouseDelta()
    this.state.yaw = normalizeYaw(this.state.yaw - dx * 0.0025)
    this.state.pitch = clamp(this.state.pitch - dy * 0.0025, -1.52, 1.52)

    const moveForward = (input.isPressed('KeyW') ? 1 : 0) - (input.isPressed('KeyS') ? 1 : 0)
    const moveStrafe = (input.isPressed('KeyD') ? 1 : 0) - (input.isPressed('KeyA') ? 1 : 0)

    const speed = input.isPressed('ShiftLeft') || input.isPressed('ShiftRight') ? CROUCH_SPEED : WALK_SPEED

    const sinYaw = Math.sin(this.state.yaw)
    const cosYaw = Math.cos(this.state.yaw)

    const wishX = moveForward * sinYaw + moveStrafe * cosYaw
    const wishZ = moveForward * cosYaw - moveStrafe * sinYaw
    const wishLength = Math.hypot(wishX, wishZ) || 1

    this.state.velocity[0] = (wishX / wishLength) * speed * (moveForward !== 0 || moveStrafe !== 0 ? 1 : 0)
    this.state.velocity[2] = (wishZ / wishLength) * speed * (moveForward !== 0 || moveStrafe !== 0 ? 1 : 0)

    if (this.state.grounded && input.isPressed('Space')) {
      this.state.velocity[1] = JUMP_SPEED
      this.state.grounded = false
    }

    this.state.velocity[1] -= GRAVITY * dt

    moveAxis(world, this.state, 'x', this.state.velocity[0] * dt)
    moveAxis(world, this.state, 'z', this.state.velocity[2] * dt)

    const yResult = moveAxis(world, this.state, 'y', this.state.velocity[1] * dt)
    if (yResult.hit) {
      if (this.state.velocity[1] < 0) {
        this.state.grounded = true
      }
      this.state.velocity[1] = 0
    } else {
      this.state.grounded = false
    }

    if (this.state.position[1] < 1) {
      this.state.position[1] = 70
      this.state.velocity = [0, 0, 0]
    }
  }

  public getEyePosition(): [number, number, number] {
    return [this.state.position[0], this.state.position[1] + EYE_HEIGHT, this.state.position[2]]
  }

  public getCameraMode(): CameraMode {
    return this.state.cameraMode
  }

  public canPlaceBlockAt(x: number, y: number, z: number): boolean {
    return !blockIntersectsPlayer(this.state, x, y, z)
  }
}
