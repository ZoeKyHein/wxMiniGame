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
    // 简单的磁吸逻辑：当玩家足够近时，自动飞向玩家
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 100) { // 100像素内自动吸附
      this.x += (dx / dist) * 8; // 飞行速度
      this.y += (dy / dist) * 8;
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

