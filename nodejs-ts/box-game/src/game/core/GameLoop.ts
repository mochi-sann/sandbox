export class GameLoop {
  private accumulator = 0

  public readonly fixedStep = 1 / 60

  public consumeSteps(deltaSeconds: number): number {
    this.accumulator += Math.min(deltaSeconds, 0.2)

    let steps = 0
    while (this.accumulator >= this.fixedStep) {
      steps += 1
      this.accumulator -= this.fixedStep
      if (steps >= 8) {
        this.accumulator = 0
        break
      }
    }

    return steps
  }
}
