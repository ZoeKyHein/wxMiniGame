// --- START OF FILE js/ui/button.js ---

export default class Button {
  constructor(x, y, width, height, text, options = {}) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.text = text;
    
    // 样式配置
    this.bgColor = options.bgColor || '#34495e';
    this.textColor = options.textColor || '#ffffff';
    this.fontSize = options.fontSize || 20;
    this.radius = options.radius || 10; // 圆角
    this.icon = options.icon || null;   // 可选图标 (Image对象)
    
    // 点击回调
    this.onClick = options.onClick || null;
    
    // 动画状态
    this.scale = 1.0;
    
    // 是否可见
    this.visible = options.visible !== undefined ? options.visible : true;
  }

  // 检测点击
  checkClick(tx, ty) {
    if (!this.visible) return false;
    
    const halfW = (this.width * this.scale) / 2;
    const halfH = (this.height * this.scale) / 2;
    
    const minX = this.x - halfW;
    const maxX = this.x + halfW;
    const minY = this.y - halfH;
    const maxY = this.y + halfH;
    
    if (tx >= minX && tx <= maxX && ty >= minY && ty <= maxY) {
      if (this.onClick) {
        try {
          this.onClick();
        } catch (e) {
          console.error('Button onClick error:', e);
        }
      }
      return true;
    }
    return false;
  }

  update() {
    // 可以在这里做呼吸效果，子类可以覆盖
  }

  render(ctx) {
    if (!this.visible) return;
    
    ctx.save();
    
    // 先移动到按钮位置
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    // 绘制阴影（需要在绘制前设置）
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    // 绘制圆角矩形背景
    ctx.fillStyle = this.bgColor;
    this.roundRect(ctx, -this.width/2, -this.height/2, this.width, this.height, this.radius);

    // 绘制文字（清除阴影）
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = this.textColor;
    ctx.font = `bold ${this.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 如果有图标，简单的布局逻辑
    if (this.icon) {
      // 图标在左，文字在右
      const iconSize = this.height * 0.6;
      ctx.drawImage(this.icon, -this.width/3 - iconSize/2, -iconSize/2, iconSize, iconSize);
      ctx.fillText(this.text, 10, 0); 
    } else {
      ctx.fillText(this.text, 0, 0);
    }

    ctx.restore();
  }

  // 辅助：画圆角矩形
  roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    
    // 边框装饰
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

