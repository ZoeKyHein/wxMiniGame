import { ElementType } from '../base/constants.js';

export default class Bullet {
  // 新增 elementType 参数，默认为 NONE
  constructor(x, y, targetX, targetY, elementType = ElementType.NONE) {
    // 把初始化逻辑抽离到 reset
    this.reset(x, y, targetX, targetY, elementType);
  }

  reset(x, y, targetX, targetY, elementType = ElementType.NONE) {
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
    const dist = Math.sqrt(dx * dx + dy * dy) || 1; // 防止除以0
    
    this.velocityX = (dx / dist) * this.speed;
    this.velocityY = (dy / dist) * this.speed;
    
    // 重置所有状态
    this.isCrit = false; // 默认不暴击
    
    // 新增：穿透逻辑
    this.pierce = 0; // 默认穿透次数 (0代表打中1个就死，1代表能穿过1个打中2个)
    this.hitList = []; // 记录已经打中过的敌人 ID (必须清空)
    
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

  render(ctx, img) {
    if (!this.active) return;

    // 1. 确定颜色
    let color = '#ffff00'; // 默认黄
    if (this.elementType === ElementType.FIRE) color = '#ff4d4d'; // 亮红
    else if (this.elementType === ElementType.WATER) color = '#4da6ff'; // 亮蓝
    else if (this.elementType === ElementType.LIGHTNING) color = '#cc66ff'; // 亮紫
    else if (this.elementType === ElementType.ICE) color = '#80dfff'; // 冰蓝

    ctx.save();
    
    // 2. 开启霓虹发光效果 (性能消耗较小，效果极好)
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;

    // 3. 绘制子弹
    // 如果有贴图，就画贴图加发光
    if (img) {
      const size = this.isCrit ? 16 : 12;
      ctx.drawImage(img, this.x - size/2, this.y - size/2, size, size);
    } 
    else {
      // 如果没有贴图，或者想增强视觉，画一个"长条形"的光束
      // 根据速度方向旋转画布，让子弹头朝前
      const angle = Math.atan2(this.velocityY, this.velocityX);
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);

      // 画一个长圆角矩形 (模拟激光/光束)
      const length = 15 + this.speed; // 速度越快越长
      const width = this.isCrit ? 8 : 6;
      
      // 绘制光芯 (白)
      ctx.fillStyle = '#ffffff';
      this.roundRect(ctx, -length/2, -width/4, length, width/2, 2);
      
      // 绘制光晕 (彩)
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6;
      this.roundRect(ctx, -length/2 - 2, -width/2, length + 4, width, 4);
    }

    ctx.restore();
  }
  
  // 辅助：画圆角矩形
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }
}
