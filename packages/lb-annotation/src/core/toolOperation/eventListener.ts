/*
 * @Author: Laoluo luozefeng@sensetime.com
 * @Date: 2022-01-12 13:15:33
 * @LastEditors: Laoluo luozefeng@sensetime.com
 * @LastEditTime: 2022-07-05 15:51:18
 */
export default class EventListener {
  private _events: Map<string, any[]>;

  constructor() {
    this._events = new Map();
  }

  /**
   * 事件绑定。(注:相同的事件下的相同方法不支持多次绑定)
   * @param eventName 事件名字
   * @param callback 事件回调
   */
  public on(eventName: string, callback: (...args: any[]) => void) {
    const existEvents = this._events.get(eventName) || [];
    if (!existEvents.some((fn) => fn === callback)) {
      this._events.set(eventName, existEvents.concat(callback));
    }
  }

  /**
   * 单独的事件绑定，一个事件仅支持绑定一个函数
   * @param eventName
   * @param callback
   */
  public singleOn(eventName: string, callback: (...args: any[]) => void) {
    this._events.set(eventName, [callback]);
  }

  /**
   * 事件广播
   * @param eventName 事件名字
   * @param callback 事件回调
   */
  public emit(eventName: string, ...args: any[]) {
    const listener = this._events.get(eventName);
    if (listener) {
      listener.forEach((fn) => {
        if (fn) {
          fn(...args);
        }
      });
    }
  }

  /**
   * 事件解绑，对某一事件进行事件解绑
   * @param eventName 需要解绑的事件名字
   * @param callback 需要解绑的方法
   */
  public unbind(eventName: string, callback: (...params: any[]) => void) {
    const existEvents: any[] | undefined = this._events.get(eventName);
    if (existEvents) {
      this._events.set(
        eventName,
        existEvents.filter((fn: () => void) => fn !== callback),
      );
    }
  }

  /**
   * 解绑事件
   * @param eventName
   */
  public unbindAll(eventName: string) {
    this._events.delete(eventName);
  }
}
