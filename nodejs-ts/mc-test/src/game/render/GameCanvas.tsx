import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { DirectionalLight, type BufferGeometry, PerspectiveCamera, Vector3 } from 'three'
import {
  GENERATION_RADIUS_CHUNKS,
  KEEP_RADIUS_CHUNKS,
  MAX_CHUNK_GEN_PER_TICK,
  MAX_MESH_REBUILD_PER_TICK,
  REACH_DISTANCE,
  VIEW_RADIUS_CHUNKS,
  CHUNK_SIZE_X,
  CHUNK_SIZE_Z,
} from '../constants'
import { GameLoop } from '../core/GameLoop'
import { InputController } from '../core/InputController'
import { PlayerController } from '../core/PlayerController'
import { raycastBlock } from '../core/raycast'
import { InventoryUI } from '../inventory/InventoryUI'
import { SaveRepository } from '../save/SaveRepository'
import { useGameStore } from '../store'
import { Hud } from '../ui/Hud'
import { buildChunkGeometry } from '../world/Mesher'
import { World } from '../world/World'
import { BlockHighlight } from './BlockHighlight'
import { ChunkMesh } from './ChunkMesh'
import { updateCameraFromPlayer } from './CameraRig'

const SAVE_INTERVAL_MS = 2000
const FOG_COLOR = 0xc8ddf0

interface SceneProps {
  world: World
  player: PlayerController
  input: InputController
  loop: GameLoop
  seed: number
}

function Scene({ world, player, input, loop, seed }: SceneProps) {
  const { camera, gl, scene } = useThree()
  const lastCenter = useRef<{ cx: number; cz: number } | null>(null)
  const fpsFrameCount = useRef(0)
  const fpsElapsed = useRef(0)
  const saveElapsedMs = useRef(0)
  const lastHud = useRef({ fps: -1, px: 0, py: 0, pz: 0, mode: '', locked: false })
  const setHud = useGameStore((state) => state.setHud)
  const inventory = useGameStore((state) => state.inventory)
  const syncInventory = useGameStore((state) => state.syncInventory)
  const setInventoryOpen = useGameStore((state) => state.setInventoryOpen)

  const cachedEye = useMemo(() => new Vector3(), [])
  const cachedDir = useMemo(() => new Vector3(), [])

  const geometriesRef = useRef<Map<string, BufferGeometry>>(new Map())
  const [chunkEntries, setChunkEntries] = useState<Array<[string, BufferGeometry]>>([])

  const syncChunkKeys = useCallback(() => {
    setChunkEntries(Array.from(geometriesRef.current.entries()))
  }, [])

  const rebuildDirtyChunks = useCallback(
    (maxCount: number) => {
      const dirty = world.collectDirtyChunkCoords(maxCount)
      if (dirty.length === 0) {
        return
      }
      const map = geometriesRef.current
      let changed = false
      for (const entry of dirty) {
        const geometry = buildChunkGeometry(world, entry.cx, entry.cz)
        const old = map.get(entry.key)
        if (old) {
          old.dispose()
          map.delete(entry.key)
        }
        if (geometry) {
          map.set(entry.key, geometry)
          changed = true
        } else if (old) {
          changed = true
        }
      }
      if (changed) {
        syncChunkKeys()
      }
    },
    [syncChunkKeys, world],
  )

  const drainChunkGeneration = useCallback(
    (maxCount: number) => {
      const generated = world.drainChunkGenerationBudget(maxCount)
      if (generated > 0) {
        rebuildDirtyChunks(MAX_MESH_REBUILD_PER_TICK)
      }
    },
    [rebuildDirtyChunks, world],
  )

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

    for (let dz = -GENERATION_RADIUS_CHUNKS; dz <= GENERATION_RADIUS_CHUNKS; dz += 1) {
      for (let dx = -GENERATION_RADIUS_CHUNKS; dx <= GENERATION_RADIUS_CHUNKS; dx += 1) {
        const targetCx = centerCx + dx
        const targetCz = centerCz + dz
        const isInsideView = Math.abs(dx) <= VIEW_RADIUS_CHUNKS && Math.abs(dz) <= VIEW_RADIUS_CHUNKS
        if (isInsideView || !world.isChunkLoaded(targetCx, targetCz)) {
          world.enqueueChunkGeneration(targetCx, targetCz)
        }
      }
    }

    const removed = world.pruneFarChunks(px, pz, KEEP_RADIUS_CHUNKS)
    if (removed.length > 0) {
      const map = geometriesRef.current
      for (const key of removed) {
        const geometry = map.get(key)
        if (geometry) {
          geometry.dispose()
          map.delete(key)
        }
      }
      syncChunkKeys()
    }
  }, [player, syncChunkKeys, world])

  useEffect(() => {
    const canvas = gl.domElement
    const onCanvasClick = (): void => {
      if (useGameStore.getState().inventoryOpen) {
        return
      }
      void canvas.requestPointerLock()
    }

    input.attach()
    canvas.addEventListener('click', onCanvasClick)

    const directional = new DirectionalLight(0xffffff, 1.1)
    directional.position.set(120, 200, 80)
    scene.add(directional)

    const geometries = geometriesRef.current

    ensureVisibleChunks()
    drainChunkGeneration(MAX_CHUNK_GEN_PER_TICK * 4)
    rebuildDirtyChunks(MAX_MESH_REBUILD_PER_TICK * 4)

    return () => {
      input.detach()
      canvas.removeEventListener('click', onCanvasClick)
      scene.remove(directional)
      for (const geometry of geometries.values()) {
        geometry.dispose()
      }
      geometries.clear()
    }
  }, [drainChunkGeneration, ensureVisibleChunks, gl.domElement, input, rebuildDirtyChunks, scene])

  useFrame((_, delta) => {
    if (input.consumeToggleInventory()) {
      const nextOpen = !useGameStore.getState().inventoryOpen
      setInventoryOpen(nextOpen)
      if (nextOpen) {
        document.exitPointerLock()
      } else {
        syncInventory()
      }
    }

    if (useGameStore.getState().inventoryOpen) {
      return
    }

    const scroll = input.consumeScroll()
    if (scroll !== 0) {
      inventory.scrollHotbar(scroll > 0 ? 1 : -1)
      syncInventory()
    }

    const steps = loop.consumeSteps(delta)

    for (let i = 0; i < steps; i += 1) {
      player.update(input, world, loop.fixedStep)

      const shouldBreak = input.consumeLeftClick()
      const shouldPlace = input.consumeRightClick()

      if (shouldBreak || shouldPlace) {
        const eye = player.getEyePosition()
        cachedEye.set(eye[0], eye[1], eye[2])
        cachedDir.set(
          Math.sin(player.state.yaw) * Math.cos(player.state.pitch),
          Math.sin(player.state.pitch),
          Math.cos(player.state.yaw) * Math.cos(player.state.pitch),
        )

        const hit = raycastBlock(world, cachedEye, cachedDir, REACH_DISTANCE)

        if (hit && shouldBreak) {
          const brokenId = world.getBlock(hit.block.x, hit.block.y, hit.block.z)
          world.setBlock(hit.block.x, hit.block.y, hit.block.z, 0, true)
          if (brokenId !== 0) {
            inventory.collectBlockDrop(brokenId)
            syncInventory()
          }
        }

        if (hit && shouldPlace && inventory.canPlaceSelected()) {
          const place = hit.previous
          if (player.canPlaceBlockAt(place.x, place.y, place.z)) {
            const blockId = inventory.getSelectedBlockId()
            if (blockId !== 0) {
              world.setBlock(place.x, place.y, place.z, blockId, true)
              inventory.removeFromSelected(1)
              syncInventory()
            }
          }
        }
      }
    }

    ensureVisibleChunks()
    drainChunkGeneration(MAX_CHUNK_GEN_PER_TICK)
    rebuildDirtyChunks(MAX_MESH_REBUILD_PER_TICK)

    updateCameraFromPlayer(camera as PerspectiveCamera, player, world)

    fpsFrameCount.current += 1
    fpsElapsed.current += delta

    if (fpsElapsed.current >= 0.2) {
      const fps = Math.round(fpsFrameCount.current / fpsElapsed.current)
      const px = player.state.position[0]
      const py = player.state.position[1]
      const pz = player.state.position[2]
      const mode = player.state.cameraMode
      const locked = document.pointerLockElement === gl.domElement
      const prev = lastHud.current
      if (
        fps !== prev.fps ||
        px !== prev.px ||
        py !== prev.py ||
        pz !== prev.pz ||
        mode !== prev.mode ||
        locked !== prev.locked
      ) {
        setHud({
          fps,
          position: [px, py, pz],
          cameraMode: mode,
          pointerLocked: locked,
        })
        lastHud.current = { fps, px, py, pz, mode, locked }
      }
      fpsFrameCount.current = 0
      fpsElapsed.current = 0
    }

    saveElapsedMs.current += delta * 1000
    if (saveElapsedMs.current >= SAVE_INTERVAL_MS) {
      saveElapsedMs.current = 0
      void SaveRepository.save(seed, player.state, inventory, world.getModifiedBlocks())
    }
  })

  return (
    <>
      <color attach="background" args={[FOG_COLOR]} />
      <fog attach="fog" args={[FOG_COLOR, CHUNK_SIZE_X * 2.5, CHUNK_SIZE_X * (VIEW_RADIUS_CHUNKS + 1)]} />
      <ambientLight intensity={0.35} />
      {chunkEntries.map(([key, geometry]) => (
        <ChunkMesh key={key} geometry={geometry} />
      ))}
      <BlockHighlight world={world} player={player} />
    </>
  )
}

export function GameCanvas() {
  const currentSave = useGameStore((state) => state.currentSave)
  const gameSeed = useGameStore((state) => state.gameSeed)
  const seed = useMemo(() => currentSave?.seed ?? gameSeed, [currentSave, gameSeed])
  const world = useMemo(
    () => new World(seed, currentSave?.modifiedBlocks ?? []),
    [seed, currentSave],
  )
  const player = useMemo(() => new PlayerController(currentSave?.player), [currentSave])
  const input = useMemo(() => new InputController(), [])
  const loop = useMemo(() => new GameLoop(), [])

  return (
    <div className="game-shell">
      <Canvas
        className="game-canvas"
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 80, 0] }}
      >
        <Scene
          world={world}
          player={player}
          input={input}
          loop={loop}
          seed={seed}
        />
      </Canvas>
      <Hud />
      <InventoryUI />
      <div className="phase-label">mc-test &middot; Phase 6 &mdash; セーブ/ロード</div>
    </div>
  )
}
