type DefaultEventType = Record<string, (...args: any[]) => void>;

export class Emitter<EventType extends DefaultEventType> {
  private eventsMap = new Map<keyof EventType, EventType[keyof EventType][]>()

  constructor() { }

  /**
   * 绑定事件
   */
  on<Key extends keyof EventType>(eventName: Key, callback: EventType[Key]) {
    const events = this.eventsMap.get(eventName) || []
    events?.push(callback)
    this.eventsMap.set(eventName, events)
    return this
  }

  /**
   * 触发事件
   */
  emit<Key extends keyof EventType>(eventName: Key, ...args: Parameters<EventType[Key]>) {
    const events = this.eventsMap.get(eventName) || []
    events.forEach(callback => callback(...args))
    return this
  }

  /**
   * 取消事件
   */
  off<Key extends keyof EventType>(eventName: Key, callback?: EventType[Key]) {
    if (!callback) {
      this.eventsMap.set(eventName, [])
    } else {
      const events = this.eventsMap.get(eventName) || []
      this.eventsMap.set(eventName, events.filter(item => item !== callback))
    }

    return this
  }
}
