import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { DirectionalLight, type BufferGeometry, PerspectiveCamera, Vector3 } from 'three'
import { GameLoop } from '../core/GameLoop'
import { InputController } from '../core/InputController'
import { PlayerController } from '../core/PlayerController'
import { raycastBlock } from '../core/raycast'
import { SaveRepository } from '../save/SaveRepository'
import type { HudData } from '../ui/Hud'
import { Hud } from '../ui/Hud'
import { BlockChunkMesh } from './BlockChunkMesh'
import { updateCameraFromPlayer } from './CameraRig'
import type { ModifiedBlock, PlayerState } from '../types'
import { buildChunkGeometry } from '../world/Mesher'
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from '../world/Chunk'
import { World } from '../world/World'

const VIEW_RADIUS_CHUNKS = 2
const KEEP_RADIUS_CHUNKS = 3
const SAVE_INTERVAL_MS = 2000

const buildInitialPlayerState = (saved: ReturnType<typeof SaveRepository.load>): Partial<PlayerState> | undefined => {
  if (!saved) {
    return undefined
  }

  return {
    position: saved.player.position,
    velocity: saved.player.velocity,
    yaw: saved.player.yaw,
    pitch: saved.player.pitch,
    cameraMode: saved.player.cameraMode,
    selectedBlockId: saved.player.selectedBlockId,
  }
}

const createDefaultHud = (): HudData => ({
  fps: 0,
  position: [0, 0, 0],
  selectedBlockId: 1,
  cameraMode: 'first',
  pointerLocked: false,
})

interface SceneProps {
  world: World
  player: PlayerController
  input: InputController
  loop: GameLoop
  chunkGeometries: Map<string, BufferGeometry>
  setChunkGeometries: Dispatch<SetStateAction<Map<string, BufferGeometry>>>
  onHudUpdate: (data: HudData) => void
  onSaveTick: (playerState: PlayerState, modified: ModifiedBlock[]) => void
}

function Scene({
  world,
  player,
  input,
  loop,
  chunkGeometries,
  setChunkGeometries,
  onHudUpdate,
  onSaveTick,
}: SceneProps) {
  const { camera, gl, scene } = useThree()

  const lastCenter = useRef<{ cx: number; cz: number } | null>(null)
  const fpsFrameCount = useRef(0)
  const fpsElapsed = useRef(0)
  const saveElapsedMs = useRef(0)

  const rebuildDirtyChunks = useCallback(() => {
    const dirty = world.collectDirtyChunkCoords()
    if (dirty.length === 0) {
      return
    }

    setChunkGeometries((previous) => {
      const next = new Map(previous)
      for (const entry of dirty) {
        const geometry = buildChunkGeometry(world, entry.cx, entry.cz)
        const old = next.get(entry.key)
        if (old) {
          old.dispose()
          next.delete(entry.key)
        }

        if (geometry) {
          next.set(entry.key, geometry)
        }
      }
      return next
    })
  }, [setChunkGeometries, world])

  const ensureVisibleChunks = useCallback(() => {
    const px = player.state.position[0]
    const pz = player.state.position[2]
    const centerCx = Math.floor(px / CHUNK_SIZE_X)
    const centerCz = Math.floor(pz / CHUNK_SIZE_Z)

    const center = lastCenter.current
    if (center && center.cx === centerCx && center.cz === centerCz) {
      return
    }

    lastCenter.current = { cx: centerCx, cz: centerCz }

    for (let dz = -VIEW_RADIUS_CHUNKS; dz <= VIEW_RADIUS_CHUNKS; dz += 1) {
      for (let dx = -VIEW_RADIUS_CHUNKS; dx <= VIEW_RADIUS_CHUNKS; dx += 1) {
        world.ensureChunk(centerCx + dx, centerCz + dz)
      }
    }

    const removed = world.pruneFarChunks(px, pz, KEEP_RADIUS_CHUNKS)
    if (removed.length > 0) {
      setChunkGeometries((previous) => {
        const next = new Map(previous)
        for (const key of removed) {
          const geometry = next.get(key)
          if (geometry) {
            geometry.dispose()
          }
          next.delete(key)
        }
        return next
      })
    }

    rebuildDirtyChunks()
  }, [player, rebuildDirtyChunks, setChunkGeometries, world])

  useEffect(() => {
    const canvas = gl.domElement
    const onCanvasClick = (): void => {
      void canvas.requestPointerLock()
    }

    input.attach()
    canvas.addEventListener('click', onCanvasClick)

    const directional = new DirectionalLight(0xffffff, 1.1)
    directional.position.set(120, 200, 80)
    scene.add(directional)

    ensureVisibleChunks()

    return () => {
      input.detach()
      canvas.removeEventListener('click', onCanvasClick)
      scene.remove(directional)
    }
  }, [camera, ensureVisibleChunks, gl.domElement, input, scene])

  useFrame((_, delta) => {
    const steps = loop.consumeSteps(delta)

    for (let i = 0; i < steps; i += 1) {
      player.update(input, world, loop.fixedStep)
      ensureVisibleChunks()
      rebuildDirtyChunks()

      const eye = player.getEyePosition()
      const eyeVec = new Vector3(eye[0], eye[1], eye[2])
      const dir = new Vector3(
        Math.sin(player.state.yaw) * Math.cos(player.state.pitch),
        Math.sin(player.state.pitch),
        Math.cos(player.state.yaw) * Math.cos(player.state.pitch),
      ).normalize()

      const shouldBreak = input.consumeLeftClick()
      const shouldPlace = input.consumeRightClick()

      if (shouldBreak || shouldPlace) {
        const hit = raycastBlock(world, eyeVec, dir, 6)
        if (hit && shouldBreak) {
          world.setBlock(hit.block.x, hit.block.y, hit.block.z, 0, true)
        }

        if (hit && shouldPlace) {
          const place = hit.previous
          if (player.canPlaceBlockAt(place.x, place.y, place.z)) {
            world.setBlock(place.x, place.y, place.z, player.state.selectedBlockId, true)
          }
        }
      }
    }

    updateCameraFromPlayer(camera as PerspectiveCamera, player, world)

    fpsFrameCount.current += 1
    fpsElapsed.current += delta
    saveElapsedMs.current += delta * 1000

    if (fpsElapsed.current >= 0.2) {
      const fps = Math.round(fpsFrameCount.current / fpsElapsed.current)
      onHudUpdate({
        fps,
        position: [
          player.state.position[0],
          player.state.position[1],
          player.state.position[2],
        ],
        selectedBlockId: player.state.selectedBlockId,
        cameraMode: player.state.cameraMode,
        pointerLocked: document.pointerLockElement === gl.domElement,
      })
      fpsFrameCount.current = 0
      fpsElapsed.current = 0
    }

    if (saveElapsedMs.current >= SAVE_INTERVAL_MS) {
      saveElapsedMs.current = 0
      onSaveTick(player.state, world.getModifiedBlocks())
    }
  })

  return (
    <>
      <ambientLight intensity={0.35} />
      {Array.from(chunkGeometries.entries()).map(([key, geometry]) => (
        <BlockChunkMesh key={key} geometry={geometry} />
      ))}
    </>
  )
}

export function GameCanvas() {
  const saved = useMemo(() => SaveRepository.load(), [])
  const seed = useMemo(() => saved?.seed ?? 424242, [saved?.seed])

  const world = useMemo(() => new World(seed, saved?.modifiedBlocks ?? []), [saved?.modifiedBlocks, seed])
  const player = useMemo(() => new PlayerController(buildInitialPlayerState(saved)), [saved])
  const input = useMemo(() => new InputController(), [])
  const loop = useMemo(() => new GameLoop(), [])

  const [hudData, setHudData] = useState<HudData>(createDefaultHud)
  const [chunkGeometries, setChunkGeometries] = useState<Map<string, BufferGeometry>>(new Map())
  const chunkGeometriesRef = useRef(chunkGeometries)

  useEffect(() => {
    chunkGeometriesRef.current = chunkGeometries
  }, [chunkGeometries])

  useEffect(() => {
    return () => {
      for (const geometry of chunkGeometriesRef.current.values()) {
        geometry.dispose()
      }
    }
  }, [])

  const handleSaveTick = useCallback((playerState: PlayerState, modified: ModifiedBlock[]) => {
    SaveRepository.save(world.seed, playerState, modified)
  }, [world.seed])

  return (
    <div className="game-shell">
      <Canvas
        className="game-canvas"
        shadows
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 80, 0] }}
      >
        <Scene
          world={world}
          player={player}
          input={input}
          loop={loop}
          chunkGeometries={chunkGeometries}
          setChunkGeometries={setChunkGeometries}
          onHudUpdate={setHudData}
          onSaveTick={handleSaveTick}
        />
      </Canvas>
      <Hud data={hudData} />
    </div>
  )
}
