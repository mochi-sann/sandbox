import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { QualityProfile } from '../../app/config'
import { useSceneStore } from '../../state/sceneStore'

const qualityRank: Record<QualityProfile, number> = {
  high: 2,
  medium: 1,
  low: 0,
}

function downgrade(profile: QualityProfile): QualityProfile {
  if (profile === 'high') {
    return 'medium'
  }

  return 'low'
}

function upgrade(profile: QualityProfile): QualityProfile {
  if (profile === 'low') {
    return 'medium'
  }

  return 'high'
}

export function PerformanceManager() {
  const adaptiveQuality = useSceneStore((state) => state.adaptiveQuality)
  const qualityProfile = useSceneStore((state) => state.qualityProfile)
  const setQualityProfile = useSceneStore((state) => state.setQualityProfile)

  const currentQualityRef = useRef<QualityProfile>(qualityProfile)
  const fpsSamplesRef = useRef<number[]>([])

  useEffect(() => {
    currentQualityRef.current = qualityProfile
  }, [qualityProfile])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')

    const applyMobileDefault = () => {
      if (mediaQuery.matches && qualityRank[currentQualityRef.current] > qualityRank.medium) {
        setQualityProfile('medium')
      }
    }

    applyMobileDefault()
    mediaQuery.addEventListener('change', applyMobileDefault)

    return () => {
      mediaQuery.removeEventListener('change', applyMobileDefault)
    }
  }, [setQualityProfile])

  const sampleWindow = useMemo(() => 90, [])

  useFrame((_state, delta) => {
    if (!adaptiveQuality || delta <= 0) {
      return
    }

    const fps = 1 / delta
    const nextSamples = fpsSamplesRef.current

    nextSamples.push(fps)

    if (nextSamples.length < sampleWindow) {
      return
    }

    const avgFps = nextSamples.reduce((sum, value) => sum + value, 0) / nextSamples.length
    fpsSamplesRef.current = []

    if (avgFps < 34 && currentQualityRef.current !== 'low') {
      const next = downgrade(currentQualityRef.current)
      currentQualityRef.current = next
      setQualityProfile(next)
      return
    }

    if (avgFps > 55 && currentQualityRef.current !== 'high') {
      const next = upgrade(currentQualityRef.current)
      currentQualityRef.current = next
      setQualityProfile(next)
    }
  })

  return null
}
