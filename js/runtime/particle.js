export default class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = Math.random() * 3 + 2; // 随机大小
    this.life = 30 + Math.random() * 20; // 存活时间
    this.maxLife = this.life;
    
    // 爆炸飞溅速度
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    // 摩擦力 (慢慢停下)
    this.friction = 0.95;
    // 重力 (可选，横版游戏通常不需要，或者很小)
    // this.gravity = 0.1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    this.life--;
  }

  render(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life / this.maxLife; // 逐渐消失
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.restore();
  }
}

