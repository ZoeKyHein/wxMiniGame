import { PickupType } from '../base/constants.js';

export default class ExpOrb {
  constructor(x, y, type = PickupType.EXP, value = 10) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.value = value;
    this.radius = (type === PickupType.COIN) ? 6 : 5;
    this.active = true;
    
    // 磁吸效果 (以后做，先预留属性)
    this.isMagnetized = false; 
  }

  update(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 使用 player.pickupRange
    // 基础吸附距离 30，加上玩家的磁吸属性
    if (dist < (30 + player.pickupRange)) {
      // 距离越近吸得越快，且可以被 pickupRange 加速
      const speed = 8 + (player.pickupRange / 20); 
      this.x += (dx / dist) * speed;
      this.y += (dy / dist) * speed;
    }
  }

  render(ctx, img) {
    if (!this.active) return;
    
    // 如果有图片资源，这里可以根据 this.type 换不同的图
    if (img && this.type === PickupType.EXP) {
      ctx.drawImage(img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    } else {
      // 代码绘制 fallback
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      if (this.type === PickupType.EXP) {
        ctx.fillStyle = '#2ecc71'; // 绿
      } else if (this.type === PickupType.COIN) {
        ctx.fillStyle = '#f1c40f'; // 金
      } else if (this.type === PickupType.HEALTH) {
        ctx.fillStyle = '#e74c3c'; // 红
      }
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

