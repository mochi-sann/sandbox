import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, EdgesGeometry, LineSegments, Vector3 } from 'three'
import type { PlayerController } from '../core/PlayerController'
import { raycastBlock } from '../core/raycast'
import { REACH_DISTANCE } from '../constants'
import type { World } from '../world/World'

interface BlockHighlightProps {
  world: World
  player: PlayerController
}

export function BlockHighlight({ world, player }: BlockHighlightProps) {
  const meshRef = useRef<LineSegments>(null)

  const geometry = useMemo(() => {
    const box = new BoxGeometry(1.002, 1.002, 1.002)
    return new EdgesGeometry(box)
  }, [])

  const eyeVec = useMemo(() => new Vector3(), [])
  const dirVec = useMemo(() => new Vector3(), [])

  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) {
      return
    }

    const eye = player.getEyePosition()
    eyeVec.set(eye[0], eye[1], eye[2])
    dirVec.set(
      Math.sin(player.state.yaw) * Math.cos(player.state.pitch),
      Math.sin(player.state.pitch),
      Math.cos(player.state.yaw) * Math.cos(player.state.pitch),
    )

    const hit = raycastBlock(world, eyeVec, dirVec, REACH_DISTANCE)
    if (hit) {
      mesh.visible = true
      mesh.position.set(hit.block.x + 0.5, hit.block.y + 0.5, hit.block.z + 0.5)
    } else {
      mesh.visible = false
    }
  })

  return (
    <lineSegments ref={meshRef} geometry={geometry} visible={false}>
      <lineBasicMaterial color="#000000" transparent opacity={0.5} />
    </lineSegments>
  )
}
