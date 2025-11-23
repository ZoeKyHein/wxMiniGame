export default class Pool {
  constructor() {
    this.pools = {};
  }

  /**
   * 获取对象
   * @param {string} name 对象池名称 (如 'bullet')
   * @param {Class} ClassConstructor 类构造函数
   * @param {...any} args 初始化参数
   */
  getItemByClass(name, ClassConstructor, ...args) {
    if (!this.pools[name]) {
      this.pools[name] = [];
    }

    // 如果池子里有存货，取出来用
    if (this.pools[name].length > 0) {
      const item = this.pools[name].pop();
      // 假设所有对象都有一个 reset 方法来重新初始化
      if (item.reset) {
        item.reset(...args);
      }
      return item;
    }

    // 如果池子空了，new 一个新的
    return new ClassConstructor(...args);
  }

  /**
   * 回收对象
   * @param {string} name 对象池名称
   * @param {Object} instance 对象实例
   */
  recover(name, instance) {
    if (!this.pools[name]) {
      this.pools[name] = [];
    }
    this.pools[name].push(instance);
  }
}

// 导出单例
export const pool = new Pool();

