type PromiseFn = (...args: any) => Promise<any>;
type GetFirstParams<T> = T extends (...args: any[]) => any ? Parameters<T>[0] : never;

interface PoolParams<T extends PromiseFn> {
  requestList: T[];
  limit: number;
  resolve?: (res: ReturnType<T>) => void;
  reject?: (res: ReturnType<T> | Error) => void;
}

/**
 * 并发控制
 * @param requestList promise列表
 * @param limit 限制并发数
 * @param resolve 单个 Promise resolve
 * @param reject 单个 Promise reject
 */
export async function promisePool<T extends PromiseFn>(params: PoolParams<T>) {
  const { requestList, limit, resolve, reject } = params;

  // 1、创建一个并发池，采用 Set 结构，方便删除
  const pool = new Set();

  // 2、开始并发执行所有的请求任务
  for (const promiseFn of requestList) {
    // 并发池内已经达到限制的容量，等待执行
    if (pool.size >= limit) await Promise.race(pool).catch((e) => e);
    // 这里因为没有 try catch，所以要捕获一下错误，不然影响下面微任务的执行

    const onfulfilled = (res: GetFirstParams<typeof resolve>) => {
      console.log('onfulfilled:', res)
      resolve?.(res);
    };

    const onrejected = (res: GetFirstParams<typeof reject>) => {
      reject?.(res);
    };

    // 继续将 promise 放入并发池中
    const promise = promiseFn();
    pool.add(promise);
    promise.then(onfulfilled, onrejected).finally(() => {
      console.log('次数')
      // 同时注册then任务，和移除操作
      pool.delete(promise);
    });
  }
}
