// --- START OF FILE js/base/camera.js ---

export default class Camera {
  constructor(viewportWidth, viewportHeight, worldWidth, worldHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    
    this.x = 0;
    this.y = 0;
  }

  follow(target) {
    // 1. 让目标位于屏幕中心
    // 目标的世界坐标 - 屏幕一半 = 摄像机左上角坐标
    let targetX = target.x - this.viewportWidth / 2;
    let targetY = target.y - this.viewportHeight / 2;

    // 2. 边界限制（Clamping）
    // 摄像机不能小于0（左/上边界）
    // 摄像机不能大于 worldSize - viewportSize（右/下边界）
    this.x = Math.max(0, Math.min(targetX, this.worldWidth - this.viewportWidth));
    this.y = Math.max(0, Math.min(targetY, this.worldHeight - this.viewportHeight));
  }
}

