import SparkMD5 from 'spark-md5'

export async function getFileHash(file: File) {
  const spark = new SparkMD5.ArrayBuffer()

  spark.append(await file.arrayBuffer())
  const hash = spark.end()
  return hash
}

/**
 * 获取文件的 hash 值
 * @param file
 * @param chunkSize
 */
export async function getCurFileHash(file: File, chunkSize: number) {
  // 小文件直接计算真实 hash 值
  if (file.size <= chunkSize) {
    const smallFileHash = await getFileHash(file)
    return smallFileHash
  }

  // 大文件不对整个文件进行处理，而是截取进行拼接，计算 hash 值
  let size = 200 * 1024
  if (file.size > 2000 * 1024) size = 500 * 1024
  const mid = Math.ceil(file.size / 2)
  const last = file.size - size
  const firstFile = file.slice(0, size)
  const midFile = file.slice(mid, mid + size)
  const lastFile = file.slice(last, file.size)
  const newFile = new File([firstFile, midFile, lastFile], file.name, { type: file.type })

  const fileHash = await getFileHash(newFile)

  return fileHash
}
