// --- START OF FILE js/core/map_system.js ---

export const ZoneType = {
  SLOW: 'slow',     // 泥潭
  DAMAGE: 'damage', // 熔岩
  HEAL: 'heal'      // 泉水
};

export class MapZone {
  constructor(x, y, width, height, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
  }

  render(ctx) {
    if (this.type === ZoneType.SLOW) ctx.fillStyle = 'rgba(149, 165, 166, 0.5)'; // 灰
    else if (this.type === ZoneType.DAMAGE) ctx.fillStyle = 'rgba(231, 76, 60, 0.4)'; // 红
    else if (this.type === ZoneType.HEAL) ctx.fillStyle = 'rgba(46, 204, 113, 0.4)'; // 绿

    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

export class Shrine {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 40;
    this.active = true;
    this.color = '#9b59b6'; // 紫色祭坛
  }

  render(ctx) {
    if (!this.active) return;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 20);
    ctx.lineTo(this.x + 20, this.y + 10);
    ctx.lineTo(this.x - 20, this.y + 10);
    ctx.fill();
    
    // 发光效果
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

export class ParallaxBG {
  constructor(image) {
    this.image = image;
  }

  render(ctx, camera, speedFactor = 0.5) {
    if (!this.image) return;
    
    // 简单的单层视差：偏移量 = camera * factor
    const offsetX = (camera.x * speedFactor) % this.image.width;
    const offsetY = (camera.y * speedFactor) % this.image.height;
    
    // 这里需要平铺绘制，逻辑与 Main.render 背景类似，但坐标计算不同
    // 为了简化，这里暂时略过复杂的平铺计算，仅作概念演示
    // 实际项目中，建议画几朵云彩图片，x = (originalX - camera.x * speedFactor)
  }
}

