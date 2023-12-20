export interface RequestProgressEvent extends ProgressEvent {
  percent: number
}

export type RequestHeaders = Headers | Record<string, string | number | null | undefined>

export interface AjaxRequestOptions {
  url: string
  method: 'GET' | 'POST'
  timeout?: number
  data: XMLHttpRequestBodyInit | FormData
  headers?: RequestHeaders
  responseType?: XMLHttpRequestResponseType
  readystatechange?: () => void
  onLoad?: () => void
  onAbort?: (e: AjaxRequestError) => void
  onError?: (e: AjaxRequestError) => void
  onSuccess?: (response: any) => void
  onUploadProgress?: (e: RequestProgressEvent) => void
}

export class AjaxRequestError extends Error {
  name = 'AjaxRequestError'
  status: number
  method: string
  url: string

  constructor(message: string, status: number, method: string, url: string) {
    super(message)
    this.status = status
    this.method = method
    this.url = url
  }
}

export interface CustomXHR extends XMLHttpRequest {
  request: () => void
}

export type AjaxRequestHandler = (option: AjaxRequestOptions) => CustomXHR

function isObject(data: any) {
  return !(data instanceof FormData) && typeof data !== null && typeof data === 'object'
}

export const ajaxRequest: AjaxRequestHandler = (option) => {
  const xhr = new XMLHttpRequest() as CustomXHR
  // const url = option.url

  if (option.timeout !== undefined) {
    xhr.timeout = option.timeout
    xhr.ontimeout = () => {
      console.log('请求超时了~')
    }
  }

  if (option.responseType) {
    xhr.responseType = option.responseType
  }

  xhr.addEventListener('readystatechange', () => {
    option.readystatechange?.()
  })

  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      option.onSuccess?.(xhr.response)
    }
  })

  if (xhr.upload && option.onUploadProgress) {
    xhr.upload.addEventListener('progress', (event) => {
      const progressEvt = event as RequestProgressEvent
      progressEvt.percent = event.total > 0 ? (event.loaded / event.total) * 100 : 0
      option.onUploadProgress?.(progressEvt)
    })
  }

  const setHeader = () => {
    const headers = option.headers || {}
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, String(value))
    }
  }

  // 封装 request 请求
  xhr.request = () => {
    let { url, data } = option
    const isGet = option.method === 'GET'
    if (isGet && data) {
      const prefix = url.includes('?') ? '&' : '?'
      if (typeof data === 'string') {
        url += prefix + data
      } else {
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(data)) {
          if (value === null || value === undefined) continue
          params.append(key, String(value))
        }
        url += prefix + params.toString()
      }
    } else if (!isGet && isObject(data)) {
      data = JSON.stringify(data)
    }
    xhr.open(option.method, url)
    setHeader()
    xhr.send(isGet ? null : data)
  }

  return xhr
}
