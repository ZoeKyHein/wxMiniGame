/**
 * 浮动伤害数字类
 * 用于显示伤害、反应等视觉反馈
 * 支持伤害数字聚合功能
 */
export default class FloatingText {
  constructor(x, y, text, color = '#ffffff', size = 20) {
    this.x = x;
    this.y = y;
    this.text = text; // 如果是数字，存为 string
    this.value = parseInt(text) || 0; // 尝试存数值（用于伤害聚合）
    this.color = color;
    this.baseSize = size;
    this.currentSize = size;
    this.active = true;
    
    // 动画参数
    this.velocityY = -2; // 向上移动速度
    this.lifeTime = 0;
    this.maxLifeTime = 60; // 60帧后消失
    this.alpha = 1.0;
    this.scale = 1; // 缩放因子（用于弹性动画）
    this.targetX = x; // 目标位置（用于聚合）
    this.targetY = y;
  }

  // 新增：合并伤害
  addValue(amount) {
    this.value += amount;
    this.text = Math.floor(this.value).toString();
    this.lifeTime = 0; // 重置寿命
    this.maxLifeTime = 60; // 重新计时
    this.scale = 1.5; // 瞬间变大，产生打击感
    this.targetY -= 5; // 稍微往上跳一点
    this.alpha = 1.0; // 重置透明度
  }

  update() {
    // 平滑移动到目标位置
    this.x += (this.targetX - this.x) * 0.2;
    this.y += (this.targetY - this.y) * 0.2;
    
    this.y += this.velocityY; // 向上飘
    this.targetY += this.velocityY; // 目标位置也上移
    this.lifeTime++;
    
    // 弹性动画回弹
    if (this.scale > 1) {
      this.scale -= 0.1;
    } else {
      this.scale = 1;
    }
    
    // 更新当前大小
    this.currentSize = this.baseSize * this.scale;
    
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
    ctx.font = `bold ${this.currentSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 添加文字描边效果，让文字更清晰
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    
    ctx.restore();
  }
}
