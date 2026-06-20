import { memo } from 'react'
import { MeshLambertMaterial, type BufferGeometry } from 'three'

const material = new MeshLambertMaterial({ vertexColors: true })

interface ChunkMeshProps {
  geometry: BufferGeometry
}

export const ChunkMesh = memo(function ChunkMesh({ geometry }: ChunkMeshProps) {
  return <mesh geometry={geometry} material={material} frustumCulled />
})
