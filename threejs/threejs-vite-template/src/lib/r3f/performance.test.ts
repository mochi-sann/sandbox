import { getDprForWidth, isMobileWidth, shouldEnableShadows } from './performance'

describe('r3f performance helpers', () => {
  it('detects mobile width', () => {
    expect(isMobileWidth(768)).toBe(true)
    expect(isMobileWidth(769)).toBe(false)
  })

  it('returns device dpr profile', () => {
    expect(getDprForWidth(480)).toEqual([1, 1.5])
    expect(getDprForWidth(1280)).toEqual([1, 2])
  })

  it('disables shadows on small screens', () => {
    expect(shouldEnableShadows(480)).toBe(false)
    expect(shouldEnableShadows(1280)).toBe(true)
  })
})
