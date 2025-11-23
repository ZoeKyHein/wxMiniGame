import { ElementType } from '../base/constants.js';
import ElementalSystem from '../core/elemental.js';
import EnemyBullet from '../weapon/enemy_bullet.js'; // 引入子弹

// 简单的 ID 生成器
let enemyIdCounter = 0;

export default class Enemy {
  // 新增 type 参数，默认 'normal'
  // 新增 hpMultiplier 参数，用于动态调整血量（数值平衡）
  constructor(worldWidth, worldHeight, type = 'normal', hpMultiplier = 1) {
    this.id = enemyIdCounter++; // 唯一 ID
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.type = type; // 'normal' | 'elite' | 'boss' | 'charger' (新增)
    
    this.initPosition();
    this.active = true;
    this.attachedElement = ElementType.NONE;
    
    // 属性配置
    if (this.type === 'boss') {
      this.width = 100;
      this.height = 100;
      this.speed = 1;     // Boss 移动很慢
      this.hp = Math.floor(5000 * hpMultiplier);      // 血量极厚（提升到5000基础值）
      this.color = '#000'; // 黑色 (或者深紫)
      this.damage = 50;   // 碰撞伤害极高
      
      // Boss 特有：射击冷却
      this.shootTimer = 0;
      this.shootInterval = 100; // 约 1.5秒射一次
    } else if (this.type === 'elite') {
      this.width = 60;
      this.height = 60;
      this.speed = 1.5;
      this.hp = Math.floor(50 * hpMultiplier);
      this.color = '#8e44ad';
      this.damage = 20;
    } else if (this.type === 'charger') { // 新增冲锋怪
      this.width = 35;
      this.height = 35;
      this.speed = 3.5;
      this.hp = Math.floor(8 * hpMultiplier);
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
      this.hp = Math.floor(10 * hpMultiplier);
      this.color = '#e74c3c'; // 红色
      this.damage = 10;
    }
    
    // 保存原始速度，用于恢复
    this.baseSpeed = this.speed;
    
    // 新增：状态控制
    this.freezeTimer = 0; // 冻结倒计时
    this.burnTimer = 0;    // 燃烧倒计时
    this.burnDamage = 0;   // 燃烧每跳伤害
    this.hitFlashTimer = 0; // 受击白闪倒计时
    
    // --- 程序化动画 ---
    this.walkCycle = 0; // 走路循环计数
    this.lastX = this.x; // 记录上一帧位置
    this.lastY = this.y;
  }

  // ... (保留 initPosition 和 update) ...
  initPosition() { 
    // 在世界范围内随机生成，但会在后续 spawnEnemy 中被覆盖
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { this.x = Math.random() * this.worldWidth; this.y = -50; } 
    else if (side === 1) { this.x = this.worldWidth + 50; this.y = Math.random() * this.worldHeight; } 
    else if (side === 2) { this.x = Math.random() * this.worldWidth; this.y = this.worldHeight + 50; } 
    else { this.x = -50; this.y = Math.random() * this.worldHeight; }
  }

  /**
   * 更新逻辑，Boss 会返回子弹数组
   */
  update(player) {
    if (this.hp <= 0) { this.active = false; return null; }
    
    // 受击白闪倒计时递减
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

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
      
      // 更新走路循环
      const moved = Math.sqrt((this.x - this.lastX)**2 + (this.y - this.lastY)**2);
      if (moved > 0.1) {
        this.walkCycle += 0.15;
      } else {
        this.walkCycle *= 0.9;
      }
      this.lastX = this.x;
      this.lastY = this.y;
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

  render(ctx, img) {
    if (!this.active) return;

    // --- 程序化动画：计算挤压拉伸和旋转 ---
    const isMoving = (Math.abs(this.x - this.lastX) > 0.1 || Math.abs(this.y - this.lastY) > 0.1);
    
    // 计算缩放 (挤压拉伸)
    const scaleY = 1 - Math.abs(Math.sin(this.walkCycle)) * 0.1; 
    const scaleX = 1 + Math.abs(Math.sin(this.walkCycle)) * 0.05;
    
    // 计算旋转 (左右摇摆)
    const rotateAngle = Math.sin(this.walkCycle) * 0.1;

    ctx.save();
    ctx.translate(this.x, this.y);
    
    // --- 绘制阴影 (永远在脚下，不随身体旋转) ---
    ctx.save();
    ctx.scale(1, 0.5); // 压扁成椭圆
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(0, this.height, this.width / 2 * scaleX, 0, Math.PI * 2); // 阴影随宽度变化
    ctx.fill();
    ctx.restore();
    
    // --- 本体变换 ---
    ctx.rotate(rotateAngle);
    ctx.scale(scaleX, scaleY);
    
    // 1. 绘制怪物本体
    if (img) {
      // 如果处于白闪状态，修改混合模式
      if (this.hitFlashTimer > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.8;
      }
      
      // 冲锋怪蓄力闪烁
      if (this.type === 'charger' && this.chargeState === 1) {
        if (Math.floor(Date.now() / 50) % 2 === 0) {
          ctx.globalCompositeOperation = 'lighter';
        }
      }
      
      // 冲锋怪旋转
      if (this.type === 'charger') {
        ctx.rotate(Math.PI / 4);
      }
      
      ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
      
      // 恢复混合模式
      if (this.hitFlashTimer > 0) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
      }
    } else {
      // 如果处于白闪状态，先画白色
      if (this.hitFlashTimer > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
      }
      
      // 没图画方块 (保持原来的代码作为 fallback)
      // 绘制 Boss 边框
      if (this.type === 'boss') {
        ctx.strokeStyle = '#f1c40f'; // 金色边框
        ctx.lineWidth = 5;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
      }
      
      // 冲锋怪画成菱形 (旋转的矩形)
      if (this.type === 'charger') {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.PI / 4); // 旋转 45度
        
        // 蓄力时变白/闪烁
        if (this.chargeState === 1) {
          if (Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.fillStyle = '#fff';
          } else {
            ctx.fillStyle = this.color;
          }
        } else {
          ctx.fillStyle = this.color;
        }
        
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
      } else {
        // 其他怪正常渲染
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
      }
    }

    // 2. 燃烧效果 (在图片上盖一层半透明橙色)
    if (this.burnTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4; // 半透明
      ctx.fillStyle = '#e67e22';
      // 稍微画大一点点覆盖
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width/2 + 2, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // 3. 冻结效果 (画个冰蓝色的框或者圆)
    if (this.freezeTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#74b9ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width/2 + 4, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. 元素附着点
    if (this.attachedElement !== ElementType.NONE) {
      ctx.save();
      ctx.fillStyle = ElementalSystem.getColor(this.attachedElement);
      ctx.beginPath();
      ctx.arc(this.x, this.y - (this.height/2 + 10), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    ctx.restore(); // 恢复变换，确保血条在世界坐标系中绘制
    
    // 血条（必须在 restore 之后，使用世界坐标）
    const maxHp = this.type === 'boss' ? 5000 : (this.type === 'elite' ? 50 : (this.type === 'charger' ? 8 : 10));
    // 根据实际血量计算 maxHp（考虑 hpMultiplier）
    const actualMaxHp = maxHp; // 这里应该用初始血量，但为了简化，用类型基础值
    if (this.type !== 'normal' || this.hp < actualMaxHp) {
      const barWidth = this.width;
      const barHeight = 5;
      const barX = this.x - barWidth / 2;
      const barY = this.y - (this.height / 2 + 15); // 稍微高一点，避免和阴影重叠
      
      // 背景
      ctx.fillStyle = '#555';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // 血量
      const hpRatio = Math.max(0, Math.min(1, this.hp / actualMaxHp));
      ctx.fillStyle = '#0f0';
      ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    }
  }
}