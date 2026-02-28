import { Perf } from 'r3f-perf'

export function PerfPanel() {
  if (!import.meta.env.DEV) return null

  return <Perf position="top-left" />
}
