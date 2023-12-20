export type SliceUploadStatus = 'ready' | 'uploading' | 'success' | 'error' | 'pause' | 'cancel'

export interface defineFile {
  file: File
  chunkSize: number
}

export interface SliceUploadFileChunk {
  chunk: File | Blob
  index: number
  chunkHash: string
  chunkName: string
  chunkTotal?: number
  status: SliceUploadStatus
  progress: number
}

export interface UploadEventType {
  start: () => void
  // finish: (params: UploadFinishParams) => void
  progress: (params: { progress: number }) => void
  error: (error: unknown) => void
  pause: () => void
  cancel: () => void
}

export type UploadEventKey = keyof UploadEventType

export interface IReturnOptions {
  url: string
  method: 'GET' | 'POST'
  data: FormData
}

export type UploadRequest = (params: SliceUploadFileChunk) => IReturnOptions
