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

    // 新增：攻击相关属性
    this.attackCooldown = 0;
    this.attackInterval = 30; // 射击间隔 (帧数)，约0.5秒
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
    // 冷却递减
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }
  }
/**
   * 尝试攻击最近的敌人
   * @param {Array} enemies - 敌人列表
   * @returns {Bullet|null} - 如果攻击成功返回子弹对象，否则返回 null
   */
  tryAttack(enemies) {
    if (this.attackCooldown > 0) return null;

    // 寻找最近的敌人
    let nearestEnemy = null;
    let minDist = Infinity;

    for (let enemy of enemies) {
      if (!enemy.active) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = dx * dx + dy * dy; // 用平方比较性能更好
      if (dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    }

    // 如果范围内有敌人（这里简单设定全屏范围，只要有敌人就打）
    if (nearestEnemy) {
      this.attackCooldown = this.attackInterval;
      // 生成指向敌人的子弹
      return new Bullet(this.x, this.y, nearestEnemy.x, nearestEnemy.y);
    }

    return null;
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