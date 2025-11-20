/**
 * 浮动伤害数字类
 * 用于显示伤害、反应等视觉反馈
 */
export default class FloatingText {
  constructor(x, y, text, color = '#ffffff', size = 20) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.active = true;
    
    // 动画参数
    this.velocityY = -2; // 向上移动速度
    this.lifeTime = 0;
    this.maxLifeTime = 60; // 60帧后消失
    this.alpha = 1.0;
  }

  update() {
    this.y += this.velocityY;
    this.lifeTime++;
    
    // 淡出效果
    if (this.lifeTime > this.maxLifeTime * 0.6) {
      const fadeProgress = (this.lifeTime - this.maxLifeTime * 0.6) / (this.maxLifeTime * 0.4);
      this.alpha = 1.0 - fadeProgress;
    }
    
    if (this.lifeTime >= this.maxLifeTime) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 添加文字描边效果，让文字更清晰
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    
    ctx.restore();
  }
}

