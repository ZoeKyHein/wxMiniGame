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
    
    this.isCrit = false; // 默认不暴击
    
    // 新增：穿透逻辑
    this.pierce = 0; // 默认穿透次数 (0代表打中1个就死，1代表能穿过1个打中2个)
    this.hitList = []; // 记录已经打中过的敌人 ID (防止重复伤害)
    
    // 新增：连锁属性
    this.chain = 0; // 弹射次数
  }

  update() {
    this.x += this.velocityX;
    this.y += this.velocityY;

    // 稍微扩大一点销毁范围，防止弹射时飞出一点点就消失
    if (this.x < -200 || this.x > 2500 || this.y < -200 || this.y > 2000) {
      this.active = false;
    }
  }
  
  // 新增：重定向方法 (用于弹射)
  redirect(targetX, targetY) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.velocityX = (dx / dist) * this.speed;
      this.velocityY = (dy / dist) * this.speed;
    }
  }

  render(ctx) {
    if (!this.active) return;
    
    // 根据元素改变子弹颜色
    if (this.elementType === ElementType.FIRE) {
      ctx.fillStyle = '#ff0000'; // 火子弹红色
    } else if (this.elementType === ElementType.WATER) {
      ctx.fillStyle = '#0000ff'; // 水子弹蓝色
    } else if (this.elementType === ElementType.LIGHTNING) {
      ctx.fillStyle = '#9b59b6'; // 雷子弹紫色
    } else if (this.elementType === ElementType.ICE) {
      ctx.fillStyle = '#74b9ff'; // 冰子弹浅蓝
    } else {
      ctx.fillStyle = '#ffff00'; // 普通子弹黄色
    }
    
    ctx.beginPath();
    // 如果暴击，子弹画大一点
    const r = this.isCrit ? 7 : 5;
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
