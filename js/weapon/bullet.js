import { ElementType } from '../base/constants.js';

export default class Bullet {
  // 新增 elementType 参数，默认为 NONE
  constructor(x, y, targetX, targetY, elementType = ElementType.NONE) {
    this.x = x;
    this.y = y;
    this.elementType = elementType; // 记录子弹元素
    this.width = 10;
    this.height = 10;
    this.speed = 10;
    this.active = true; // 是否存活

    // 计算飞行方向向量
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    this.velocityX = (dx / dist) * this.speed;
    this.velocityY = (dy / dist) * this.speed;
  }

  update() {
    this.x += this.velocityX;
    this.y += this.velocityY;

    // 简单边界销毁：飞出屏幕太远就销毁
    // (这里假设屏幕大小大致范围，简单处理)
    if (this.x < -100 || this.x > 2000 || this.y < -100 || this.y > 1500) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;
    
    // 根据元素改变子弹颜色
    if (this.elementType === ElementType.FIRE) {
      ctx.fillStyle = '#ff0000'; // 火子弹红色
    } else if (this.elementType === ElementType.WATER) {
      ctx.fillStyle = '#0000ff'; // 水子弹蓝色
    } else {
      ctx.fillStyle = '#ffff00'; // 普通子弹黄色
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
