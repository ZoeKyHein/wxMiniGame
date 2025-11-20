export default class Bullet {
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
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
    
    ctx.fillStyle = '#ffff00'; // 黄色子弹
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
