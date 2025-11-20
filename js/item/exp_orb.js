export default class ExpOrb {
  constructor(x, y, value = 10) {
    this.x = x;
    this.y = y;
    this.value = value; // 提供的经验值
    this.radius = 5;
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

  render(ctx) {
    if (!this.active) return;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#2ecc71'; // 绿色经验球
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }
}

