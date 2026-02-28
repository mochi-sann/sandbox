import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: ReactNode }) => (
    <div data-testid="mock-canvas">{children}</div>
  ),
  useFrame: () => {},
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
}))

vi.mock('r3f-perf', () => ({
  Perf: () => null,
}))

describe('App', () => {
  it('renders heading and canvas shell', () => {
    render(<App />)

    expect(screen.getByText('Production-ready 3D foundation')).toBeInTheDocument()
    expect(screen.getByLabelText('R3F preview scene')).toBeInTheDocument()
    expect(screen.getByTestId('mock-canvas')).toBeInTheDocument()
  })
})
