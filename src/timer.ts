export default class Timer {
  #offset = 0
  #speed = 0

  constructor(protected now = performance.now) {}

  get time() {
    return this.#offset + this.#speed * this.now()
  }

  get speed() {
    return this.#speed
  }

  set time(time) {
    this.#offset = time - this.#speed * this.now()
  }

  set speed(speed) {
    this.#offset += (this.#speed - speed) * this.now()
    this.#speed = speed
  }
}
