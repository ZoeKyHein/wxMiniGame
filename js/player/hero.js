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
    
    // --- 新增：血量属性 ---
    this.maxHp = 100;
    this.hp = 100;
    this.isDead = false;
    // 无敌帧 (防止一瞬间被秒杀)
    this.invincibleTime = 0;
  }

  update(inputVector) {
    // 移动逻辑保持不变
    if (inputVector.x !== 0 || inputVector.y !== 0) {
      this.x += inputVector.x * this.speed;
      this.y += inputVector.y * this.speed;
      if (this.x < 0) this.x = 0;
      if (this.y < 0) this.y = 0;
      if (this.x > this.screenWidth) this.x = this.screenWidth;
      if (this.y > this.screenHeight) this.y = this.screenHeight;
    }
    
    if (this.attackCooldown > 0) this.attackCooldown--;
    
    // --- 新增：无敌帧递减 ---
    if (this.invincibleTime > 0) this.invincibleTime--;
  }
  
  /**
   * 受到伤害
   */
  takeDamage(amount) {
    if (this.invincibleTime > 0 || this.isDead) return;
    
    this.hp -= amount;
    this.invincibleTime = 30; // 被打后有0.5秒无敌时间（假设60fps）
    console.log(`Player HP: ${this.hp}`);
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    }
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
  
  render(ctx) {
    if (this.isDead) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 受伤闪烁效果
    if (this.invincibleTime > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }
    
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(5, -5, 5, 5);
    
    ctx.restore();
  }
}