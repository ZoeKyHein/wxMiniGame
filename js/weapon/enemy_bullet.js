export default class EnemyBullet {
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    this.width = 8;
    this.height = 8;
    this.speed = 6;
    this.active = true;
    this.damage = 15; // 单发伤害

    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.velocityX = (dx / dist) * this.speed;
    this.velocityY = (dy / dist) * this.speed;
  }

  update() {
    this.x += this.velocityX;
    this.y += this.velocityY;

    // 飞出屏幕销毁
    if (this.x < -50 || this.x > 2000 || this.y < -50 || this.y > 1500) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;
    
    ctx.fillStyle = '#e74c3c'; // 红色子弹
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

