export default class Particle {
  constructor(x, y, color, config = {}) {
    this.reset(x, y, color, config);
  }

  reset(x, y, color, config = {}) {
    this.x = x;
    this.y = y;
    this.color = color;
    
    // 默认配置，支持覆盖
    this.size = config.size || (Math.random() * 3 + 2);
    this.life = config.life || (20 + Math.random() * 10);
    this.maxLife = this.life;
    
    // 速度与方向
    const speed = config.speed || (Math.random() * 3 + 1);
    const angle = config.angle !== undefined ? config.angle : (Math.random() * Math.PI * 2);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    // 物理属性
    this.friction = config.friction || 0.9; // 摩擦力
    this.gravity = config.gravity || 0;      // 重力
    this.shrink = config.shrink || 0.1;      // 消失时缩小速度
    
    this.shape = config.shape || 'circle';   // 'circle' | 'rect'
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    this.life--;
    
    // 逐渐缩小
    if (this.life < this.maxLife * 0.5) {
      this.size = Math.max(0, this.size - this.shrink);
    }
  }

  render(ctx) {
    if (this.size <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.life / this.maxLife; // 透明度渐变
    ctx.fillStyle = this.color;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }
    
    ctx.restore();
  }
}

