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

/** 몇 프레임(tick 이전 프레임 포함)을 스킵할지에 대한 설정값. 초시계 값에는 영항 없음. */
export const skipFrames = 1
/** n초 기다리기 블록을 1틱 지연시킬지 여부. */
export const delayMode = false

export const codec = 'avc'
export const bitrate = new Quality('medium')

// Entry.tickTime = 1000 / 60
