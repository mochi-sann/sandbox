export class InputController {
  private readonly keys = new Set<string>()

  private mouseDeltaX = 0

  private mouseDeltaY = 0

  private leftClickQueued = false

  private rightClickQueued = false

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code)
  }

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code)
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement) {
      this.mouseDeltaX += event.movementX
      this.mouseDeltaY += event.movementY
    }
  }

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (!document.pointerLockElement) {
      return
    }

    if (event.button === 0) {
      this.leftClickQueued = true
    }
    if (event.button === 2) {
      this.rightClickQueued = true
    }
  }

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault()
  }

  public attach(): void {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('contextmenu', this.onContextMenu)
  }

  public detach(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('contextmenu', this.onContextMenu)
  }

  public isPressed(code: string): boolean {
    return this.keys.has(code)
  }

  public consumeMouseDelta(): { dx: number; dy: number } {
    const dx = this.mouseDeltaX
    const dy = this.mouseDeltaY
    this.mouseDeltaX = 0
    this.mouseDeltaY = 0
    return { dx, dy }
  }

  public consumeLeftClick(): boolean {
    const value = this.leftClickQueued
    this.leftClickQueued = false
    return value
  }

  public consumeRightClick(): boolean {
    const value = this.rightClickQueued
    this.rightClickQueued = false
    return value
  }
}
