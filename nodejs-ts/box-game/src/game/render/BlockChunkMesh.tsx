import { memo } from 'react'
import { MeshLambertMaterial, type BufferGeometry } from 'three'

const material = new MeshLambertMaterial({ vertexColors: true })

interface Props {
  geometry: BufferGeometry
}

export const BlockChunkMesh = memo(function BlockChunkMesh({ geometry }: Props) {
  return <mesh geometry={geometry} material={material} frustumCulled />
})
