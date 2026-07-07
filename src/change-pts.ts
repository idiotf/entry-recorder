import { StreamTarget, Mp4OutputFormat, Output, Input, MP4, BlobSource, EncodedVideoPacketSource, EncodedPacketSink, EncodedPacket } from 'mediabunny'

interface SaveFilePickerOptions {
  excludeAcceptAllOption?: boolean
  id?: string
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
  suggestedName?: string
  types?: SaveFileType[]
}

interface OpenFilePickerOptions {
  excludeAcceptAllOption?: boolean
  id?: string
  multiple?: boolean
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
  types?: SaveFileType[]
}

interface SaveFileType {
  accept: Record<string, string[]>
  description?: string
}

declare global {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/showOpenFilePicker) */
  function showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>

  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/showSaveFilePicker) */
  function showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>

  interface Math {
    seedrandom(seed: any): void
  }
}

const inputHandles = await showOpenFilePicker({
  startIn: 'videos',
  multiple: true,
  types: [{
    accept: {
      'video/mp4': ['.mp4'],
    },
  }],
})

const outputHandle = await showSaveFilePicker({
  startIn: 'videos',
  types: [{
    accept: {
      'video/mp4': ['.mp4'],
    },
  }],
})

const inputVideoTracks = await Promise.all(inputHandles.sort((a, b) => a.name > b.name ? 1 : a.name < b.name ? -1 : 0).map(async handle => {
  const input = new Input({
    formats: [MP4],
    source: new BlobSource(await handle.getFile()),
  })

  const track = (await input.getPrimaryVideoTrack())!
  const decoderConfig = (await track.getDecoderConfig())!
  const sink = new EncodedPacketSink(track)

  return { track, decoderConfig, sink }
}))
console.log(inputHandles)

const stream = await outputHandle.createWritable()

const output = new Output({
  format: new Mp4OutputFormat,
  target: new StreamTarget(stream),
})

const { track: firstInputTrack, decoderConfig } = inputVideoTracks[0]!
const source = new EncodedVideoPacketSource(firstInputTrack.codec!)
output.addVideoTrack(source, { frameRate: 62.5 })
await output.start()

for (let i = 0; i < inputVideoTracks.length; ++i) {
  const { sink } = inputVideoTracks[i]!

  const track = inputVideoTracks[i + 1]?.track
  const nextFirstTimestamp = await track?.getFirstTimestamp()
  for await (const packet of sink.packets()) {
    if (
      typeof nextFirstTimestamp != 'number' ||
      packet.timestamp < nextFirstTimestamp
    ) await source.add(packet, { decoderConfig })
  }
}

await output.finalize()
alert('병합이 완료되었습니다.')
