import SparkMD5 from 'spark-md5';
import { defineFile, SliceUploadFileChunk } from './type';

/**
 * 分片处理器，将文件按照指定的大小切成一块块分片
 * @param file 上传源文件
 * @param chunkSize 分片大小
 */
export async function chunkWorker(file: File, chunkSize: number) {
  const sliceChunks: SliceUploadFileChunk[] = [];
  const chunkSpark = new SparkMD5.ArrayBuffer();

  // 1、计算文件被分为多少块
  const chunkTotal = Math.ceil(file.size / chunkSize);

  // 2、进行分片操作
  for (let index = 0; index < chunkTotal; index++) {
    const start = index * chunkSize;
    // 最后一块分片需要进行处理
    const end = start + chunkSize >= file.size ? file.size : start + chunkSize;
    const chunk = file.slice(start, end);

    // 计算分片的 hash 值
    let chunkHash = '';
    const arrayBuffer = await chunk.arrayBuffer();
    chunkSpark?.append(arrayBuffer);
    chunkHash = chunkSpark?.end();
    const chunkName = `${chunkHash}_${index}`

    sliceChunks.push({
      chunk,
      index,
      chunkHash,
      chunkName,
      chunkTotal,
      status: 'ready',
      progress: 0
    });
  }

  // 3、返回处理好的分片
  return sliceChunks;
}
