export default class Hero {
  constructor(screenWidth, screenHeight) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    // 初始位置：屏幕中心
    this.x = screenWidth / 2;
    this.y = screenHeight / 2;
    
    // 属性
    this.width = 40;
    this.height = 40;
    this.speed = 4; // 移动速度
    this.color = '#3498db'; // 蓝色
  }

  /**
   * 更新位置
   * @param {Object} inputVector - 摇杆输入的向量 {x, y}
   */
  update(inputVector) {
    if (inputVector.x === 0 && inputVector.y === 0) return;

    this.x += inputVector.x * this.speed;
    this.y += inputVector.y * this.speed;

    // 边界限制
    if (this.x < 0) this.x = 0;
    if (this.y < 0) this.y = 0;
    if (this.x > this.screenWidth) this.x = this.screenWidth;
    if (this.y > this.screenHeight) this.y = this.screenHeight;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 绘制简单的方块代表主角
    ctx.fillStyle = this.color;
    // 中心绘制
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    
    // 加个简单的“脸”表示方向（以后再做）
    ctx.fillStyle = '#fff';
    ctx.fillRect(5, -5, 5, 5);
    
    ctx.restore();
  }
}