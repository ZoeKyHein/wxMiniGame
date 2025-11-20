import { ElementType } from '../base/constants.js';
import ElementalSystem from '../core/elemental.js';

export default class Enemy {
  constructor(screenWidth, screenHeight) {
    // ... (保留原有逻辑) ...
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.initPosition();
    this.width = 30;
    this.height = 30;
    this.speed = 2;
    this.hp = 10; // 加点血，不然一下就秒了，看不出反应
    this.active = true;
    
    // 新增：当前附着的元素
    this.attachedElement = ElementType.NONE;
  }

  // ... (保留 initPosition 和 update) ...
  initPosition() { /* 保持不变 */ 
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { this.x = Math.random() * this.screenWidth; this.y = -50; } 
    else if (side === 1) { this.x = this.screenWidth + 50; this.y = Math.random() * this.screenHeight; } 
    else if (side === 2) { this.x = Math.random() * this.screenWidth; this.y = this.screenHeight + 50; } 
    else { this.x = -50; this.y = Math.random() * this.screenHeight; }
  }

  update(player) {
    if (this.hp <= 0) { this.active = false; return; }
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }

  render(ctx) {
    if (!this.active) return;

    // 基础颜色：红色
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

    // 绘制元素附着状态 (如果有)
    if (this.attachedElement !== ElementType.NONE) {
      ctx.save();
      // 在敌人上方画一个小圆点代表附着元素
      ctx.fillStyle = ElementalSystem.getColor(this.attachedElement);
      ctx.beginPath();
      ctx.arc(this.x, this.y - 25, 5, 0, Math.PI * 2);
      ctx.fill();
      // 也可以给敌人加个边框颜色
      ctx.strokeStyle = ElementalSystem.getColor(this.attachedElement);
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
      ctx.restore();
    }
    
    // 血条
    ctx.fillStyle = '#555';
    ctx.fillRect(this.x - 15, this.y - 20, 30, 4);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(this.x - 15, this.y - 20, 30 * (this.hp / 10), 4);
  }
}