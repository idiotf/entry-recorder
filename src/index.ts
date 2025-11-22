import { StreamTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_MEDIUM } from 'mediabunny'
import resize from './resize'
import Timer from './timer'

interface SaveFilePickerOptions {
  excludeAcceptAllOption?: boolean
  id?: string
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
  suggestedName?: string
  types?: SaveFileType[]
}

interface SaveFileType {
  accept: Record<string, string[]>
  description?: string
}

declare global {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/showSaveFilePicker) */
  function showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>

  interface Math {
    seedrandom(seed: any): void
  }
}

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
Math.seedrandom(prompt('시드를 입력하세요.', 'made by aqu3180'))
const seededRandom = Math.random
Math.random = originalRandom

const originalRequestAnimationFrame = requestAnimationFrame
const originalCancelAnimationFrame = cancelAnimationFrame

Entry.engine.toggleRun()
Entry.addEventListener('stop', () => controller.abort())

clearInterval(Entry.engine.ticker)
setInterval(Entry.engine.update)

const timeouts: [handler: TimerHandler, timeout: number, ...args: unknown[]][] = []
const frameTasks: FrameRequestCallback[] = []

function scheduleFrame(callback: FrameRequestCallback) {
  return frameTasks.push(callback)
}

function unscheduleFrame(handle: number) {
  delete frameTasks[handle]
}

const withMonkeyPatch = <Return, Args extends any[]>(callback: (...args: Args) => Return) => (...args: Args) => {
  Math.random = seededRandom
  self.requestAnimationFrame = scheduleFrame
  self.cancelAnimationFrame = unscheduleFrame

  const value = callback(...args)

  Math.random = originalRandom
  self.requestAnimationFrame = originalRequestAnimationFrame
  self.cancelAnimationFrame = originalCancelAnimationFrame

  return value
}

async function createVideoEncoder() {
  const handle = await self.showSaveFilePicker({
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

  resize(width, height)

  const canvasSource = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: QUALITY_MEDIUM,
  })

  output.addVideoTrack(canvasSource)
  await output.start()

  let frameNo = 0
  const timer = new Timer(() => frameNo * Entry.tickTime / 1000)

  Entry.engine.updateProjectTimer = time =>
    time == null || Entry.engine.projectTimer.setValue((timer.time = time).toFixed(3))

  Object.defineProperty(Entry.engine.projectTimer, 'isPaused', {
    get() {
      return !timer.speed
    },
    set(isPaused) {
      if (isPaused) timer.speed = 0
      else timer.speed = 1
    },
  })

  Entry.TimeWait = class TimeWait extends Entry.TimeWait {
    override startTime = this.now()

    constructor(id: unknown, cb: Function, ms: number) {
      super(id, cb, ms)
      clearTimeout(this.timer)
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
    const ms = frameNo++ * Entry.tickTime

    frameTasks.forEach(withMonkeyPatch((callback, i) => {
      callback(ms)
      delete frameTasks[i]
    }))

    Entry.stage?.update()
    await canvasSource.add(ms / 1000)

    timeouts.forEach(([handler, timeout, ...args], i) => {
      if (timeout <= ms) {
        if (typeof handler == 'string') eval(handler)
        else handler(...args)
        delete timeouts[i]
      }
    })

    Entry.engine.projectTimer.setValue(timer.time.toFixed(3))
    withMonkeyPatch(() => Entry.engine.update())()
  }

  await output.finalize()
  alert('녹화가 끝났습니다.')
}
