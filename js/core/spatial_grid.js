// --- START OF FILE js/core/spatial_grid.js ---

export default class SpatialGrid {
  constructor(worldWidth, worldHeight, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldWidth / cellSize);
    this.rows = Math.ceil(worldHeight / cellSize);
    this.buckets = new Map();
  }

  clear() {
    this.buckets.clear();
  }

  // 将实体注册到网格中
  add(entity) {
    // 计算实体所在的格子（可能跨越多个格子，这里简化为中心点所在的格子，
    // 如果实体很大，建议改为注册到 minX~maxX, minY~maxY 覆盖的所有格子）
    const cellKey = this._getKey(entity.x, entity.y);
    if (!this.buckets.has(cellKey)) {
      this.buckets.set(cellKey, []);
    }
    this.buckets.get(cellKey).push(entity);
  }

  // 获取附近的实体
  retrieve(entity) {
    // 获取当前格子及周围 8 个格子
    const cx = Math.floor(entity.x / this.cellSize);
    const cy = Math.floor(entity.y / this.cellSize);
    let results = [];

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const key = `${cx + i},${cy + j}`;
        if (this.buckets.has(key)) {
          results = results.concat(this.buckets.get(key));
        }
      }
    }
    return results;
  }

  _getKey(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }
}

