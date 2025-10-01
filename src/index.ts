import { StreamTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_MEDIUM } from 'mediabunny'
import resize from './resize'
import Timer from './timer'

/**
 * `Entry.engine.ticker`에 들어갈 값입니다. 만약 이 값이 `clearInterval`에 사용된다면,
 * `controller.abort()`가 호출됩니다.
 */
const ticker = -1

/**
 * `clearInterval(Entry.engine.ticker)`가 호출될 때 abort됩니다.
 */
const controller = new AbortController

/**
 * 만약 `id`에 `ticker`의 값이 들어온다면, `controller.abort()`를 호출합니다.
 */
self.clearInterval = (clearInterval => id => {
  if (id == ticker) controller.abort()
  else clearInterval(id)
})(clearInterval)

/**
 * 만약 `handler`에 `Entry.engine.update` 메서드가 들어온다면,
 * `setInterval` 대신에 비디오 인코더를 생성하고 `ticker`를 리턴합니다.
 */
self.setInterval = (setInterval => (handler, timeout, ...args) => {
  if (handler == Entry.engine.update) {
    createVideoEncoder()
    return ticker
  } else return setInterval(handler, timeout, ...args)
})(setInterval)

const originalRandom = Math.random
;(Math as any).seedrandom('made by aqu3180')
const seededRandom = Math.random
Math.random = originalRandom

Entry.engine.toggleRun()
Entry.addEventListener('stop', () => controller.abort())

clearInterval(Entry.engine.ticker)
setInterval(Entry.engine.update)

async function createVideoEncoder() {
  const handle: FileSystemFileHandle = await (self as any).showSaveFilePicker({
    startIn: 'videos',
    types: [{
      accept: {
        'video/mp4': ['.mp4'],
      },
    }],
  })
  const stream = await handle.createWritable()

  const output = new Output({
    format: new Mp4OutputFormat,
    target: new StreamTarget(stream),
  })

  const canvas = Entry.canvas_
  const width = 2560, height = 1440

  disableEntryFHD(canvas, width, height)
  resize(width, height)

  const canvasSource = new CanvasSource(canvas, {
    codec: 'av1',
    bitrate: QUALITY_MEDIUM,
  })

  output.addVideoTrack(canvasSource)
  await output.start()

  let frameNo = 0
  const timer = new Timer(() => frameNo * Entry.tickTime / 1000)

  Entry.engine.updateProjectTimer = time =>
    time == null || Entry.engine.projectTimer.setValue((timer.time = time).toFixed(3))

  Object.defineProperty(Entry.engine.projectTimer, 'isPaused', {
    set(isPaused) {
      if (isPaused) timer.speed = 0
      else timer.speed = 1
    },
  })

  const timeouts: Parameters<typeof setTimeout>[] = []
  Entry.TimeWait = class TimeWait extends Entry.TimeWait {
    override startTime = this.now()

    constructor(id: unknown, cb: Function, ms: number) {
      super(id, cb, ms)
      clearTimeout(this.timer!)
      this.timer = this.setTimeout(this.callback.bind(this), ms)
    }

    protected now() {
      return frameNo * Entry.tickTime
    }

    protected setTimeout(handler: TimerHandler, timeout = 0, ...args: unknown[]) {
      return timeouts.push([handler, timeout + this.now(), ...args])
    }

    protected clearTimeout(id: number) {
      delete timeouts[id]
    }

    override pause() {
      if (this.timer) {
        this.ms! -= (this.now() - this.startTime!)
        this.clearTimeout(this.timer)
      }
    }

    override resume() {
      this.timer = this.setTimeout(this.callback.bind(this), this.ms)
      this.startTime = this.now()
    }
  }

  while (!controller.signal.aborted) {
    Entry.stage?.update()

    const ms = frameNo++ * Entry.tickTime
    await canvasSource.add(ms / 1000)

    for (const [handler, timeout, ...args] of timeouts) if (timeout! <= ms) {
      if (typeof handler == 'string') eval(handler)
      else handler(...args)
    }

    Entry.engine.projectTimer.setValue(timer.time.toFixed(3))
    Math.random = seededRandom
    Entry.engine.update()
    Math.random = originalRandom
  }

  await output.finalize()
  alert('done recording')
}

function disableEntryFHD(canvas: HTMLCanvasElement, width: number, height: number) {
  Object.defineProperties(canvas, {
    offsetWidth: {
      get() {
        return width
      },
    },
    offsetHeight: {
      get() {
        return height
      },
    },
  })
}
