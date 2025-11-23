// --- START OF FILE js/item/obstacle.js ---

export const ObstacleType = {
  PILLAR: 'pillar', // 无敌，阻挡移动和子弹
  BARREL: 'barrel'  // 可破坏，爆炸
};

export default class Obstacle {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    
    if (type === ObstacleType.PILLAR) {
      this.width = 60;
      this.height = 80;
      this.color = '#7f8c8d'; // 灰色石头
      this.hp = Infinity;
    } else if (type === ObstacleType.BARREL) {
      this.width = 40;
      this.height = 50; // 简单的圆柱体视觉
      this.color = '#e74c3c'; // 红色炸药桶
      this.hp = 30; // 几枪就爆
    }
  }

  takeDamage(amount) {
    if (this.type === ObstacleType.PILLAR) return false;
    
    this.hp -= amount;
    if (this.hp <= 0) {
      this.active = false;
      return true; // destroyed
    }
    return false;
  }

  render(ctx, img) {
    if (!this.active) return;

    // 简单的绘制逻辑，以后可以换图
    ctx.fillStyle = this.color;
    
    if (this.type === ObstacleType.PILLAR) {
      // 柱子画出立体感
      ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
      // 顶面
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(this.x - this.width/2, this.y - this.height/2 - 10, this.width, 10);
    } else {
      // 炸药桶
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width/2, 0, Math.PI*2);
      ctx.fill();
      // 标志
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', this.x, this.y);
    }
    
    // 调试用的碰撞框 (可选)
    // ctx.strokeStyle = 'red';
    // ctx.strokeRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
  }
}

