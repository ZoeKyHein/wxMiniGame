import Bullet from '../weapon/bullet.js';
import { ElementType } from '../base/constants.js'; // 引入常量

export default class Hero {
  constructor(screenWidth, screenHeight) {
    // ... (保留属性) ...
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.x = screenWidth / 2;
    this.y = screenHeight / 2;
    this.width = 40;
    this.height = 40;
    this.speed = 4;
    this.color = '#3498db';
    this.attackCooldown = 0;
    this.attackInterval = 30;
    
    // --- 修改：当前持有的元素，默认为 NONE ---
    this.currentElement = ElementType.NONE;
  }

  // ... (update 保持不变) ...
  update(inputVector) {
     if (inputVector.x !== 0 || inputVector.y !== 0) {
       this.x += inputVector.x * this.speed;
       this.y += inputVector.y * this.speed;
       if (this.x < 0) this.x = 0; if (this.y < 0) this.y = 0;
       if (this.x > this.screenWidth) this.x = this.screenWidth; if (this.y > this.screenHeight) this.y = this.screenHeight;
     }
     if (this.attackCooldown > 0) this.attackCooldown--;
  }

  tryAttack(enemies) {
    if (this.attackCooldown > 0) return null;

    let nearestEnemy = null;
    let minDist = Infinity;

    for (let enemy of enemies) {
      if (!enemy.active) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      this.attackCooldown = this.attackInterval;
      
      // --- 修改：使用当前 currentElement 发射 ---
      return new Bullet(this.x, this.y, nearestEnemy.x, nearestEnemy.y, this.currentElement);
    }

    return null;
  }
  
  // render 保持不变
  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(5, -5, 5, 5);
    ctx.restore();
  }
}