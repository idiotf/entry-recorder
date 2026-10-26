import {
  Quality,
  // type VideoTransformOptions,
} from 'mediabunny'

export const renderWidth = 2560
export const renderHeight = 1440
export const outputTransform = undefined

// export const renderWidth = 1920
// export const renderHeight = 1080
// export const outputTransform: VideoTransformOptions = {
//   width: 1080,
//   height: 1920,
//   fit: 'contain',
// }

/** 몇 프레임(tick 이전 프레임 포함)을 스킵할지에 대한 설정값. 초시계 값에는 프레임이 모두 스킵된 이후부터의 시간만 누적됨. */
export const frozenFrames = 1
/** n초 기다리기 블록을 1틱 지연시킬지 여부. */
export const delayMode = false

export const timerOffset = 0

export const codec = 'avc'
export const bitrate = new Quality('medium')

export const maxFrameDuration = Infinity

// Entry.tickTime = 1000 / 60
