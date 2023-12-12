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
  progress: (params: { progress: number }) => void
}

export type UploadEventKey = keyof UploadEventType
