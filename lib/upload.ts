import { Emitter } from './emitter';
import { chunkWorker } from './chunk';
import { UploadEventKey, UploadEventType, SliceUploadFileChunk } from './type';



class SliceUpload {
  private file: File | null
  private filename: string
  private chunkSize: number
  private sliceFileChunks: SliceUploadFileChunk
  private poolCount: number
  private events = new Emitter()

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
   *
  */
  start() {
    // 文件不存在，不执行
    if (this.file) return

    // 设置文件名
    this.setFileName(this.file!.name)

    // 判断文件大小，获取文件的 hash 值

    // 判断文件是否超过设置的 chunkSize 大小
    // 没有
    console.log(`开始对[${this.file!.name}]文件进行切片`);
    this.sliceFileChunks = chunkWorker(this.file, this.chunkSize)

  }



}



const uploader = new SliceUpload({
  chunkSize: 1024 ** 2 * 2,
  poolCount: 4
})

uploader.setFile()
