import { Emitter } from './emitter';
import { chunkWorker } from './chunk';
import { UploadEventKey, UploadEventType, SliceUploadFileChunk, SliceUploadStatus, UploadRequest } from './type';
import { AjaxRequestOptions, ajaxRequest, CustomXHR } from './ajax';
import { promisePool } from './pool';
import { getCurFileHash } from './hash';



export default class SliceUpload {
  private file: File | null
  private filename: string
  private fileHash: string
  private chunkSize: number
  private sliceFileChunks: SliceUploadFileChunk[]
  private poolCount: number
  private events = new Emitter()
  private isExist: boolean

  private isCancel = false
  private isPause = false

  private uploadRequest: UploadRequest
  private xhr: (CustomXHR | null)[] = []

  constructor(options) {
    this.chunkSize = options.chunkSize || 1024 ** 2 * 2
    this.poolCount = options.poolCount || 4
  }

  on<Key extends UploadEventKey>(eventName: Key, callback: UploadEventType[Key]) {
    this.events.on(eventName, callback)
    return this
  }

  off<Key extends UploadEventKey>(eventName: Key, callback?: UploadEventType[Key]) {
    this.events.off(eventName, callback)
    return this
  }

  emit<Key extends UploadEventKey>(eventName: Key, ...args: Parameters<UploadEventType[Key]>) {
    this.events.emit(eventName, ...args)
    return this
  }

  /**
   * 设置上传文件（单个）
   * @param file
   * @returns
  */
  setFile(file: File) {
    this.file = file;
    return this;
  }


  /**
   * 设置文件名
   * @param name
   */
  setFileName(name: string) {
    this.filename = name;
  }

  /**
   * 设置上传请求
   * @param request
   */
  setUploadRequest(request: UploadRequest) {
    this.uploadRequest = request
  }

  /**
   *
  */
  async start() {
    this.check()

    // 设置文件名
    this.setFileName(this.file!.name)

    // 生成文件 hash
    if (!this.fileHash) {
      this.fileHash = await getCurFileHash(this.file, this.chunkSize)
    }

    // 预检
    const result = await this.verifyFile()
    // 服务器已经存在该文件
    if (result) {
      this.emit('progress', { progress: 100 })
      return
    }

    // 判断文件是否超过设置的 chunkSize 大小
    // 没有
    console.log(`开始对[${this.file!.name}]文件进行切片`);
    this.sliceFileChunks = await chunkWorker(this.file!, this.chunkSize)

    // 处理成 promise 列表
    const requestList: any = this.sliceFileChunks.map(v => {
      return () => {
        const promise = new Promise<any>((resolve, reject) => {
          // 获取当前的 chunk 对象
          const chunk = this.findSliceFileChunk(v.chunkHash)!
          const idx = this.sliceFileChunks.findIndex(v => v.chunkHash === chunk.chunkHash)

          // 请求参数
          const options = this.uploadRequest(v)
          const requestOptions: AjaxRequestOptions = {
            // url: "http://localhost:8888/upload/",
            // method: "POST",
            // data,
            ...options,
            readystatechange: () => {
              if (this.stop) this.xhr[idx]!.abort()
              return this.stop
            },
            onAbort: (error) => {
              if (chunk.progress !== 100) {
                chunk.status = 'ready'
                reject(error)
              }
            },
            onError: (error) => {
              // 更新当前的 chunk 状态为错误
              chunk.status = 'error'

              // 通知外界该 分片 出错了
              this.emit('error', error)
            },
            onSuccess: (result) => {
              // 更新当前 chunk 的状态为成功
              chunk.status = 'success'

              // 更新当前 chunk 的进度为 100
              chunk.progress = 100

              // 更新进度
              this.emitProgress()
              this.emitFinish()

              resolve(result)
            },
            onUploadProgress: (event) => {
              // 更新当前 chunk 的进度条
              chunk.progress = event.percent

              this.emitProgress()
            }
          }

          // const instance = ajaxRequest(requestOptions)
          // instance.request()
          this.xhr[idx] =ajaxRequest(requestOptions)
          this.xhr[idx]!.request()
        })

        return promise
      }
    })

    private check() {
      if (!this.file)
        throw new Error('file is required')
      if (!this.uploadRequestInstance)
        throw new Error('uploadRequestInstance is required')
      if (!this.file?.size)
        throw new Error('file size is 0')
    }

    promisePool({
      requestList,
      limit: this.poolCount,
      resolve: () => {
        console.log('完成')
        // this.emitFinish()
      },
      reject: () => {
        console.log('reject')
      }
    })
  }

  /**
   * 对文件进行预检
   */
  async verifyFile() {
    return new Promise(async (resolve, reject) => {
      const verifyOption = {
        url: 'http://localhost:8888/upload/verify',
        method: 'POST' as const,
        headers: {
          'content-type': 'application/json',
        },
        data: JSON.stringify({
          filename: this.filename,
          fileHash: this.fileHash,
        }),
        onSuccess: (result) => {
          const data = JSON.parse(result)
          resolve(data.data)
        },
      }

      const xhr = ajaxRequest(verifyOption)
      await xhr.request()
    })
  }


  /**
   * 根据hash值找到对应的分片
   * @param chunkHash
   * @returns
   */
  findSliceFileChunk(chunkHash: string) {
    return this.sliceFileChunks.find(chunk => chunk.chunkHash === chunkHash)
  }

  /**
   * 进度更新并发布
   */
  emitProgress() {
    const progress = this.progress
    this.emit('progress', { progress })
  }

  /**
   * 完成后，发起合并请求
   */
  emitFinish() {
    const status = this.status
    if (status === 'success') {
      console.log('发起合并请求')
      const mergeOption = {
        url: 'http://localhost:8888/upload/merge',
        method: 'POST' as const,
        headers: {
          'content-type': 'application/json',
        },
        data: JSON.stringify({
          fileHash: this.fileHash,
          // 服务器存储的文件名: hash+文件后缀
          filename: this.filename,
          // 用于服务器合并文件
          size: this.chunkSize,
        }),
      }

      const xhr = ajaxRequest(mergeOption)
      xhr.request()
    }
  }

  /**
   * 获取分片数据
   */
  getChunkData() {
    console.log('分片数据：',  this.sliceFileChunks)
    return this.sliceFileChunks
  }

  /**
   * 取消请求
   */
  abort() {
    this.xhr.forEach(v => v && v.abort())
    this.xhr = []
  }

  /**
   * 暂停上传
   */
  pause() {
    this.isPause = true
    this.abort()
    this.emit('pause')
  }

  /**
   * 取消上传
   */
  cancel() {
    this.isCancel = true
    this.abort()
    this.emit('cancel')
  }

  private get stop() {
    return this.isCancel || this.isPause
  }


  /**
   * 上传总进度
   */
  get progress() {
    const chunks = this.sliceFileChunks
    const length = chunks.length
    if (!length) return 0
    const progressTotal = chunks.map(chunk => chunk.progress).reduce((pre, cur) => pre + cur, 0)
    return progressTotal / length
  }

  /**
   * 状态
   */
  get status(): SliceUploadStatus {
    const chunks = this.sliceFileChunks
    if (!chunks.length)
      return 'ready'

    // if (this.isCancel)
    //   return 'cancel'

    // if (this.isPause)
    //   return 'pause'

    if (chunks.some(v => v.status === 'uploading'))
      return 'uploading'

    if (chunks.every(v => v.status === 'success'))
      return 'success'

    if (chunks.some(v => v.status === 'error'))
      return 'error'

    return 'ready'
  }
}
