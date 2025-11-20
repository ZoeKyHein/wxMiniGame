import { ElementType } from '../base/constants.js';
import ElementalSystem from '../core/elemental.js';
import EnemyBullet from '../weapon/enemy_bullet.js'; // 引入子弹

// 简单的 ID 生成器
let enemyIdCounter = 0;

export default class Enemy {
  // 新增 type 参数，默认 'normal'
  constructor(screenWidth, screenHeight, type = 'normal') {
    this.id = enemyIdCounter++; // 唯一 ID
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.type = type; // 'normal' | 'elite' | 'boss' | 'charger' (新增)
    
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
    } else if (this.type === 'charger') { // 新增冲锋怪
      this.width = 35;
      this.height = 35;
      this.speed = 3.5;
      this.hp = 8;
      this.color = '#e67e22'; // 橙色
      this.damage = 15;
      // 冲锋状态机: 0=追击, 1=蓄力, 2=冲锋, 3=硬直
      this.chargeState = 0;
      this.chargeTimer = 0;
      this.chargeDir = {x: 0, y: 0}; // 冲锋方向
    } else {
      this.width = 30;
      this.height = 30;
      this.speed = 2;
      this.hp = 10;
      this.color = '#e74c3c'; // 红色
      this.damage = 10;
    }
    
    // 保存原始速度，用于恢复
    this.baseSpeed = this.speed;
    
    // 新增：状态控制
    this.freezeTimer = 0; // 冻结倒计时
    this.burnTimer = 0;    // 燃烧倒计时
    this.burnDamage = 0;   // 燃烧每跳伤害
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

    // 1. 处理燃烧 (DoT)
    if (this.burnTimer > 0) {
      this.burnTimer--;
      // 每 30 帧 (约0.5秒) 跳一次伤害
      if (this.burnTimer % 30 === 0) {
        this.hp -= this.burnDamage;
      }
      // 烧死了
      if (this.hp <= 0) {
        this.active = false;
        return { diedByDot: true }; // 告诉 main 是被烧死的
      }
    }

    // 2. 处理冻结状态
    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      // 冻结时无法移动，也无法攻击
      return null;
    }

    // 2. 处理减速 (冰元素附着)
    let currentSpeed = this.baseSpeed;
    if (this.attachedElement === ElementType.ICE) {
      currentSpeed = this.baseSpeed * 0.5; // 减速 50%
    }

    // 冲锋怪特殊逻辑
    if (this.type === 'charger') {
      this.updateCharger(player, currentSpeed);
      return null;
    }

    // 3. 普通移动逻辑
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.x += (dx / dist) * currentSpeed;
      this.y += (dy / dist) * currentSpeed;
    }

    // Boss 射击逻辑
    if (this.type === 'boss') {
      this.shootTimer++;
      if (this.shootTimer >= this.shootInterval) {
        this.shootTimer = 0;
        const bullets = this.shoot(player);
        return { bullets: bullets };
      }
    }
    return null;
  }
  
  updateCharger(player, currentSpeed) {
    // 状态机
    if (this.chargeState === 0) { // 追击 (Chase)
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // 靠近到一定距离 (例如 200) 开始蓄力
      if (dist < 200) {
        this.chargeState = 1;
        this.chargeTimer = 40; // 蓄力 40帧 (约0.6秒)
      } else {
        this.x += (dx / dist) * currentSpeed;
        this.y += (dy / dist) * currentSpeed;
      }
    } 
    else if (this.chargeState === 1) { // 蓄力 (Prepare)
      this.chargeTimer--;
      if (this.chargeTimer <= 0) {
        this.chargeState = 2;
        this.chargeTimer = 20; // 冲锋持续 20帧
        // 锁定方向
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.chargeDir = { x: dx/dist, y: dy/dist };
      }
    }
    else if (this.chargeState === 2) { // 冲锋 (Dash)
      this.chargeTimer--;
      // 极快速度移动
      const dashSpeed = currentSpeed * 4; 
      this.x += this.chargeDir.x * dashSpeed;
      this.y += this.chargeDir.y * dashSpeed;
      
      if (this.chargeTimer <= 0) {
        this.chargeState = 3;
        this.chargeTimer = 60; // 硬直/休息 1秒
      }
    }
    else if (this.chargeState === 3) { // 硬直 (Cooldown)
      this.chargeTimer--;
      if (this.chargeTimer <= 0) {
        this.chargeState = 0; // 回到追击
      }
    }
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

    // 冲锋怪蓄力时变白/闪烁
    if (this.type === 'charger' && this.chargeState === 1) {
      if (Math.floor(Date.now() / 50) % 2 === 0) {
        ctx.fillStyle = '#fff';
      } else {
        ctx.fillStyle = this.color;
      }
    } else {
      ctx.fillStyle = this.color;
    }
    
    ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

    // 燃烧视觉效果 (橙色滤镜)
    if (this.burnTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#e67e22'; // 橙色
      ctx.fillRect(this.x - this.width/2 - 2, this.y - this.height/2 - 2, this.width + 4, this.height + 4);
      ctx.restore();
    }

    // 冻结时的视觉效果 (覆盖一层浅蓝边框)
    if (this.freezeTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#74b9ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
      ctx.restore();
    }

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