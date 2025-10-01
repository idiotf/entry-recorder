export default class Timer {
  #speedChangeTime = 0
  #resetTime
  #speed = 0

  constructor(protected now = performance.now) {
    this.#resetTime = this.now()
  }

  get time() {
    return this.#speedChangeTime + this.#speed * (this.now() - this.#resetTime)
  }

  get speed() {
    return this.#speed
  }

  set time(time: number) {
    this.#speedChangeTime = time - this.#speed * (this.now() - this.#resetTime)
  }

  set speed(speed: number) {
    const now = this.now()
    this.#speedChangeTime += this.#speed * (now - this.#resetTime)
    this.#resetTime = now
    this.#speed = speed
  }
}
