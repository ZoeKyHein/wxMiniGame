// --- START OF FILE js/item/chest.js ---

export default class Chest {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 50;
    this.height = 50;
    this.active = true;
    this.opened = false;
    this.openAnimation = 0; // 开箱动画帧数
  }

  open() {
    if (this.opened) return false;
    this.opened = true;
    this.openAnimation = 20; // 动画持续20帧
    return true;
  }

  update() {
    if (this.openAnimation > 0) {
      this.openAnimation--;
    }
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.opened) {
      // 已打开的宝箱：画一个打开的盖子
      ctx.fillStyle = '#8b4513'; // 棕色
      ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
      
      // 打开的盖子（向上倾斜）
      ctx.save();
      ctx.translate(0, -this.height/2);
      ctx.rotate(-0.3); // 旋转角度
      ctx.fillStyle = '#654321';
      ctx.fillRect(-this.width/2, 0, this.width, 10);
      ctx.restore();
      
      // 闪光效果（动画）
      if (this.openAnimation > 0) {
        ctx.globalAlpha = this.openAnimation / 20;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, this.width, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else {
      // 未打开的宝箱：画一个完整的箱子
      ctx.fillStyle = '#8b4513'; // 棕色
      ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
      
      // 边框
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 2;
      ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
      
      // 锁
      ctx.fillStyle = '#ffd700'; // 金色锁
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

