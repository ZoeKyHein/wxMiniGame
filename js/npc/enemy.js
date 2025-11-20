import { ElementType } from '../base/constants.js';
import ElementalSystem from '../core/elemental.js';
import EnemyBullet from '../weapon/enemy_bullet.js'; // 引入子弹

export default class Enemy {
  // 新增 type 参数，默认 'normal'
  constructor(screenWidth, screenHeight, type = 'normal') {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.type = type; // 'normal' | 'elite' | 'boss'
    
    this.initPosition();
    this.active = true;
    this.attachedElement = ElementType.NONE;
    
    // 属性配置
    if (this.type === 'boss') {
      this.width = 100;
      this.height = 100;
      this.speed = 1;     // Boss 移动很慢
      this.hp = 500;      // 血量极厚
      this.color = '#000'; // 黑色 (或者深紫)
      this.damage = 50;   // 碰撞伤害极高
      
      // Boss 特有：射击冷却
      this.shootTimer = 0;
      this.shootInterval = 100; // 约 1.5秒射一次
    } else if (this.type === 'elite') {
      this.width = 60;
      this.height = 60;
      this.speed = 1.5;
      this.hp = 50;
      this.color = '#8e44ad';
      this.damage = 20;
    } else {
      this.width = 30;
      this.height = 30;
      this.speed = 2;
      this.hp = 10;
      this.color = '#e74c3c'; // 红色
      this.damage = 10;
    }
  }

  // ... (保留 initPosition 和 update) ...
  initPosition() { /* 保持不变 */ 
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { this.x = Math.random() * this.screenWidth; this.y = -50; } 
    else if (side === 1) { this.x = this.screenWidth + 50; this.y = Math.random() * this.screenHeight; } 
    else if (side === 2) { this.x = Math.random() * this.screenWidth; this.y = this.screenHeight + 50; } 
    else { this.x = -50; this.y = Math.random() * this.screenHeight; }
  }

  /**
   * 更新逻辑，Boss 会返回子弹数组
   */
  update(player) {
    if (this.hp <= 0) { this.active = false; return null; }

    // 移动
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }

    // Boss 射击逻辑
    if (this.type === 'boss') {
      this.shootTimer++;
      if (this.shootTimer >= this.shootInterval) {
        this.shootTimer = 0;
        return this.shoot(player);
      }
    }
    return null;
  }

  shoot(player) {
    // 发射 3 颗扇形子弹
    const bullets = [];
    // 计算指向玩家的角度
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    
    // 中间一颗
    bullets.push(new EnemyBullet(this.x, this.y, player.x, player.y));
    
    // 左偏 20度
    const leftX = this.x + Math.cos(angle - 0.3) * 100;
    const leftY = this.y + Math.sin(angle - 0.3) * 100;
    bullets.push(new EnemyBullet(this.x, this.y, leftX, leftY));
    
    // 右偏 20度
    const rightX = this.x + Math.cos(angle + 0.3) * 100;
    const rightY = this.y + Math.sin(angle + 0.3) * 100;
    bullets.push(new EnemyBullet(this.x, this.y, rightX, rightY));

    return bullets;
  }

  render(ctx) {
    if (!this.active) return;

    // 绘制 Boss 边框
    if (this.type === 'boss') {
      ctx.strokeStyle = '#f1c40f'; // 金色边框
      ctx.lineWidth = 5;
      ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }

    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

    // 元素附着点
    if (this.attachedElement !== ElementType.NONE) {
      ctx.save();
      ctx.fillStyle = ElementalSystem.getColor(this.attachedElement);
      ctx.beginPath();
      ctx.arc(this.x, this.y - (this.height/2 + 15), 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // 血条
    const maxHp = this.type === 'boss' ? 500 : (this.type === 'elite' ? 50 : 10);
    if (this.type !== 'normal' || this.hp < maxHp) {
      ctx.fillStyle = '#555';
      ctx.fillRect(this.x - this.width/2, this.y - (this.height/2 + 10), this.width, 5);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(this.x - this.width/2, this.y - (this.height/2 + 10), this.width * (Math.max(0, this.hp) / maxHp), 5);
    }
  }
}