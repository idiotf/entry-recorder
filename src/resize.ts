declare global {
  var Entry: EntryGlobal
}

interface EntryGlobal {
  addEventListener(type: string, handler: () => void): unknown
  canvas_: HTMLCanvasElement
  engine: {
    isState(state: string): boolean
    update(): void
    toggleRun(): void
    ticker: number
    updateProjectTimer(time: number): void
    projectTimer: {
      setValue(v: unknown): void
      isPaused: boolean
    }
  }
  dispatchEvent(event: string, object: Entity): void
  type: string
  options: {
    useWebGL?: boolean
  }
  requestUpdate: boolean
  container: {
    selectObject(id: string): void
    objects_: {
      entity: {
        object: StageObject
      }
    }[]
  }
  hw: {
    _createRandomRoomId(): string
  }
  tickTime: number
  TimeWait: typeof TimeWait
  TimeWaitManager: TimeWaitManager
  stage?: Stage
}

declare class TimeWait {
  startTime?: number
  timer?: number
  id?: unknown
  cb?: Function
  ms?: number

  constructor(id?: unknown, cb?: Function, ms?: number)

  callback(): void
  pause(): void
  resume(): void
  destroy(): void
}

interface TimeWaitManager {
  add(id: unknown, cb: Function, ms: number): void
  remove(id: unknown): void
}

interface Stage {
  updateObject(): void
  isEntitySelectable(): boolean
  update(): void
  handle: Handle
  variableContainer: {
    children: StageObject[]
  }
  isObjectClick: boolean
  inputField: InputField | null
  canvas: {
    update?(): void
    children: StageObject[]
    x: number
    y: number
    scaleX: number
    scaleY: number
    canvas: HTMLCanvasElement
  }
  _app: {
    render?(): void
    screen?: Resizable
    renderer?: {
      resize(width: number, height: number): void
      options: Resizable
    }
  }
}

interface InputField {
  _isHidden: boolean
  _x: number
  _y: number
  _padding: number
  getPixiView(): {
    scale: Settable
    position: Settable
  }
  x(data: number): void
  y(data: number): void
  width(data: number): void
  height(data: number): void
  padding(data: number): void
  borderWidth(data: number): void
  borderRadius(data: number): void
  fontSize(data: number): void
}

interface Settable {
  x: number
  y: number
  set(x?: number, y?: number): this
}

interface Resizable {
  width: number
  height: number
}

interface EntryObject {
  id: string
  getLock(): boolean
}

interface Entity {
  x: number
  y: number
  setX(data: number): void
  setY(data: number): void
  initCommand(): void
  parent: EntryObject
}

interface StageEvent {
  stageX: number
  stageY: number
}

interface StageObject {
  offsetX: number
  offsetY: number
  variable: {
    getWidth(): number
    getHeight(): number
    setWidth(data: number): void
    setHeight(data: number): void
    getX(): number
    setSlideCommandX(x: number): void
    isResizing?: boolean
    isAdjusting?: boolean
    slideBar_?: StageObject
    valueSetter_?: StageObject
    resizeHandle_?: StageObject
    scrollButton_?: StageObject
    setX(data: number): void
    setY(data: number): void
    updateView(): void
  }
  x: number
  y: number
  cursor: string
  children: StageObject[]
  resolution?: number
  parent: {
    x: number
    y: number
    cursor: string
  }
  offset: {
    x: number
    y: number
  }
  on(event: string, handler: (event: StageEvent) => void): void
  removeAllListeners?(event: string): void
  removeAllEventListeners?(event: string): void
  entity: Entity
  _viewportPatched?: number
  _events?: {
    [k: string]: {
      fn(event: StageEvent): void
    }
  }
}

interface Handle {
  getEventCoordinate(event: StageEvent): {
    x: number
    y: number
  }
}

export default async function resize(width: number, height: number) {
  const global = ((document.querySelector('iframe.eaizycc0') as HTMLIFrameElement | null)?.contentWindow || self) as {
    Entry?: EntryGlobal
  }
  const Entry = await new Promise<EntryGlobal | undefined>(resolve => resolve(global.Entry)).catch(() => {})
  const stage = Entry?.stage
  if (!stage) return

  const { type, engine, options: { useWebGL } } = Entry
  const { canvas } = stage
  const canvasElement = canvas.canvas

  if (useWebGL) for (const text of canvas.children.flatMap(function findTree(v): StageObject[] { return [v, ...v.children.flatMap(findTree)] }).filter(v => v.resolution)) text.resolution = width / 640

  if (canvasElement.width != width || canvasElement.height != height) {
    canvasElement.width = width
    canvasElement.height = height
    canvas.x = width / 2
    canvas.y = height / 2
    canvas.scaleX = width / 480
    canvas.scaleY = height / 270

    const { _app } = stage, { screen, renderer } = _app
    if (screen && renderer) {
      screen.width = width
      screen.height = height
      renderer.resize(width, height)
      renderer.options.width = width
      renderer.options.height = height
    }

    _app.render?.()
    canvas.update?.()
  }

  const inputField = stage.inputField
  if (inputField && !inputField._isHidden && inputField._padding != width * 13 / 640) {
    inputField.x(Math.round(width * 3 / 128))
    inputField.y(Math.round(height * 55 / 72))
    inputField.width(Math.max(1, width * 13 / 16))
    inputField.height(Math.max(1, height / 15))
    inputField.padding(width * 13 / 640)
    inputField.borderWidth(width / 320)
    inputField.borderRadius(width / 64)
    inputField.fontSize(width / 32)

    if (useWebGL) {
      const view = inputField.getPixiView()
      view.scale.set(480 / width, 270 / height)
      view.position.set((inputField._x - canvas.x) / canvas.scaleX, (inputField._y - canvas.y) / canvas.scaleY)
    }
    Entry.requestUpdate = true
    stage.update()
    Entry.requestUpdate = false
  }

  Entry.container.objects_.forEach(({ entity: { object } }, i) => {
    if (object._viewportPatched == i) return
    object._viewportPatched = i
    object.removeAllListeners?.('__pointermove')
    object.removeAllListeners?.('__pointerup')
    object.removeAllEventListeners?.('mousedown')
    object.removeAllEventListeners?.('pressmove')
    object.on(useWebGL ? '__pointermove' : 'mousedown', ({ stageX, stageY }) => {
      Entry.dispatchEvent('entityClick', object.entity)
      stage.isObjectClick = true
      if (Entry.type != 'minimize' && stage.isEntitySelectable()) {
        object.offset = {
          x: -object.parent.x + object.entity.x - ((stageX - canvas.x) / canvas.scaleX),
          y: -object.parent.y - object.entity.y - ((stageY - canvas.y) / canvas.scaleY),
        }
        object.cursor = 'move'
        object.entity.initCommand()
        Entry.container.selectObject(object.entity.parent.id)
      }
    })
    object.on(useWebGL ? '__pointerup' : 'pressmove', ({ stageX, stageY }) => {
      if (!stage.isEntitySelectable()) return
      const { entity } = object
      if (entity.parent.getLock()) return
      if (object.offset) {
        entity.setX((stageX - canvas.x) / canvas.scaleX + object.offset.x)
        entity.setY((canvas.y - stageY) / canvas.scaleY - object.offset.y)
      }
      stage.updateObject()
    })
  })
  const variables = stage.variableContainer.children
  variables.forEach((variable, i) => {
    const { variable: variableObj } = variable
    const { slideBar_, valueSetter_, resizeHandle_, scrollButton_ } = variableObj
    if (slideBar_) slideBar: {
      if (slideBar_._viewportPatched == i) break slideBar
      slideBar_._viewportPatched = i
      slideBar_.removeAllListeners?.('__pointermove')
      slideBar_.removeAllEventListeners?.('mousedown')
      slideBar_.on(useWebGL ? '__pointermove' : 'mousedown', ({ stageX }) => engine.isState('run') && variableObj.setSlideCommandX(stageX / canvas.scaleX - variableObj.getX() - canvas.x / canvas.scaleX))
    }

    if (valueSetter_) valueSetter: {
      if (valueSetter_._viewportPatched == i) break valueSetter
      valueSetter_._viewportPatched = i
      valueSetter_.removeAllListeners?.('__pointermove')
      valueSetter_.removeAllListeners?.('__pointerup')
      valueSetter_.removeAllEventListeners?.('mousedown')
      valueSetter_.removeAllEventListeners?.('pressmove')
      valueSetter_.on(useWebGL ? '__pointermove' : 'mousedown', ({ stageX }) => engine.isState('run') && (
        variableObj.isAdjusting = true,
        valueSetter_.offsetX = stageX / canvas.scaleX - valueSetter_.x
      ))
      valueSetter_.on(useWebGL ? '__pointerup' : 'pressmove', ({ stageX }) => engine.isState('run') && variableObj.setSlideCommandX(stageX / canvas.scaleX - valueSetter_.offsetX + 5))
    }

    if (resizeHandle_) resizeHandle: {
      if (resizeHandle_._viewportPatched == i) break resizeHandle
      resizeHandle_._viewportPatched = i
      resizeHandle_.removeAllListeners?.('__pointermove')
      resizeHandle_.removeAllListeners?.('__pointerup')
      resizeHandle_.removeAllEventListeners?.('mousedown')
      resizeHandle_.removeAllEventListeners?.('pressmove')
      resizeHandle_.on(useWebGL ? '__pointermove' : 'mousedown', ({ stageX, stageY }) => {
        variableObj.isResizing = !0
        resizeHandle_.offset = {
          x: stageX / canvas.scaleX - variableObj.getWidth(),
          y: stageY / canvas.scaleY - variableObj.getHeight(),
        }
        resizeHandle_.parent.cursor = 'nwse-resize'
      })
      resizeHandle_.on(useWebGL ? '__pointerup' : 'pressmove', ({ stageX, stageY }) => {
        variableObj.setWidth(stageX / canvas.scaleX - resizeHandle_.offset.x)
        variableObj.setHeight(stageY / canvas.scaleY - resizeHandle_.offset.y)
        variableObj.updateView()
      })
    }

    if (scrollButton_) scrollButton: {
      if (scrollButton_._viewportPatched == i) break scrollButton
      scrollButton_._viewportPatched = i
      scrollButton_.removeAllListeners?.('__pointermove')
      scrollButton_.removeAllListeners?.('__pointerup')
      scrollButton_.removeAllEventListeners?.('mousedown')
      scrollButton_.removeAllEventListeners?.('pressmove')
      scrollButton_.on(useWebGL ? '__pointermove' : 'mousedown', ({ stageY }) => {
        variableObj.isResizing = !0
        scrollButton_.offsetY = stageY - scrollButton_.y * canvas.scaleY
      })
      scrollButton_.on(useWebGL ? '__pointerup' : 'pressmove', ({ stageY }) => {
        scrollButton_.y = Math.max(25, Math.min(variableObj.getHeight() - 30, (stageY - scrollButton_.offsetY) / canvas.scaleY))
        variableObj.updateView()
      })
    }

    variable: {
      if (variable._viewportPatched == i) break variable
      variable._viewportPatched = i
      variable.removeAllListeners?.('__pointermove')
      variable.removeAllListeners?.('__pointerup')
      variable.removeAllEventListeners?.('mousedown')
      variable.removeAllEventListeners?.('pressmove')
      variable.on(useWebGL ? '__pointermove' : 'mousedown', ({ stageX, stageY }) => type == 'workspace' && (
        variable.offset = {
          x: variable.x - (stageX - canvas.x) / canvas.scaleX,
          y: variable.y - (stageY - canvas.y) / canvas.scaleY,
        }
      ))
      variable.on(useWebGL ? '__pointerup' : 'pressmove', ({ stageX, stageY }) => type != 'workspace' || variableObj.isResizing || variableObj.isAdjusting || (
        variableObj.setX((stageX - canvas.x) / canvas.scaleX + variable.offset.x),
        variableObj.setY((stageY - canvas.y) / canvas.scaleY + variable.offset.y),
        variableObj.updateView()
      ))
    }
  })
  stage.handle.getEventCoordinate = ({ stageX, stageY }) => ({
    x: (stageX - canvas.x) / canvas.scaleX,
    y: (stageY - canvas.y) / canvas.scaleY,
  })
}

export {}
