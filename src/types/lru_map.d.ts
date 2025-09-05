declare module 'lru_map' {
  export class LRUMap<K = any, V = any> {
    constructor(capacity?: number)
    get(key: K): V | undefined
    set(key: K, value: V): this
    has(key: K): boolean
    delete(key: K): boolean
    shift(): [K, V] | undefined
  }
}