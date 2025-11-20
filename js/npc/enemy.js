export default class Enemy {
  constructor(screenWidth, screenHeight) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    
    // 随机从屏幕四周生成
    this.initPosition();

    this.width = 30;
    this.height = 30;
    this.speed = 2;
    this.hp = 3;
    this.active = true;
  }

  initPosition() {
    // 简单的随机生成逻辑：0=上, 1=右, 2=下, 3=左
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { // 上
      this.x = Math.random() * this.screenWidth;
      this.y = -50;
    } else if (side === 1) { // 右
      this.x = this.screenWidth + 50;
      this.y = Math.random() * this.screenHeight;
    } else if (side === 2) { // 下
      this.x = Math.random() * this.screenWidth;
      this.y = this.screenHeight + 50;
    } else { // 左
      this.x = -50;
      this.y = Math.random() * this.screenHeight;
    }
  }

  /**
   * 敌人追踪逻辑
   * @param {Object} player - 玩家对象，用于获取位置
   */
  update(player) {
    if (this.hp <= 0) {
      this.active = false;
      return;
    }

    // 计算朝向玩家的向量
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }

  render(ctx) {
    if (!this.active) return;

    ctx.fillStyle = '#e74c3c'; // 红色敌人
    ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    
    // 显示血条 (可选)
    // ctx.fillStyle = 'green';
    // ctx.fillRect(this.x - 15, this.y - 25, this.hp * 10, 5);
  }
}
