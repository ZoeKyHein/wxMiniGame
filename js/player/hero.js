import Bullet from '../weapon/bullet.js';
import { ElementType } from '../base/constants.js'; // 引入常量
import { pool } from '../base/pool.js'; // 引入对象池

export default class Hero {
  constructor(screenWidth, screenHeight, config = {}) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.x = screenWidth / 2;
    this.y = screenHeight / 2;
    this.width = 40;
    this.height = 40;
    this.speed = config.baseSpeed || 4;
    this.color = config.color || '#3498db';
    this.attackCooldown = 0;
    this.attackInterval = 30;
    this.baseAttackInterval = this.attackInterval;
    
    // --- 修改：当前持有的元素，默认为 NONE ---
    this.currentElement = config.startElement || ElementType.NONE;
    
    // --- 新增：血量属性 ---
    this.maxHp = config.baseHp || 100;
    this.hp = this.maxHp;
    this.isDead = false;
    // 无敌帧 (防止一瞬间被秒杀)
    this.invincibleTime = 0;
    
    // --- 新增：战斗属性 ---
    this.projectileCount = 1; // 子弹数量
    this.critRate = 0;        // 暴击率 (0 ~ 1)
    this.damageMultiplier = 1; // 伤害倍率（天赋加成）
    
    // --- 新增属性 ---
    this.pierceCount = 0; // 默认不穿透
    this.pickupRange = 50; // 默认捡球范围
    
    // --- 新增：连锁属性 ---
    this.chainCount = 0; // 默认 0
    
    // --- 新增：Build 属性 ---
    this.elementLevels = {
      [ElementType.FIRE]: 0,
      [ElementType.WATER]: 0,
      [ElementType.LIGHTNING]: 0,
      [ElementType.ICE]: 0
    };
    
    this.passives = {
      executioner: false, // 处刑者：对异常状态敌人增伤
      shatter: false,     // 碎冰：攻击冻结敌人必定暴击
      blast_radius: 0,    // 爆炸范围加成
      // 新增：融合技
      fusion_storm: false,    // 风暴之眼 (雷+水)：连锁次数+2，且连锁伤害不减
      fusion_frostfire: false // 霜火 (冰+火)：冻结敌人会同时受到猛烈燃烧
    };

    this.trait = config.trait || 'none';

    // 角色特质初始化
    if (this.trait === 'none') {
      this.pierceCount = 1;
      this.critRate = 0.2;
    }

    // 法师元素循环
    this.elementCycle = [
      ElementType.FIRE,
      ElementType.LIGHTNING,
      ElementType.ICE,
      ElementType.WATER
    ];
    this.currentElementIndex = 0;
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
   * @returns {boolean} 是否真正受到了伤害
   */
  takeDamage(amount) {
    if (this.invincibleTime > 0 || this.isDead) return false;

    this.hp -= amount;
    this.invincibleTime = 30; // 被打后有0.5秒无敌时间（假设60fps）
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    }

    return true;
  }

  tryAttack(enemies) {
    if (this.attackCooldown > 0) return []; // 改为返回数组

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
      let attackElement = this.currentElement;

      if (this.trait === 'prismatic') {
        attackElement = this.elementCycle[this.currentElementIndex];
        this.currentElementIndex = (this.currentElementIndex + 1) % this.elementCycle.length;
      }

      let interval = this.attackInterval;
      if (this.trait === 'blood_pact') {
        const missingPct = Math.max(0, (this.maxHp - this.hp) / this.maxHp);
        interval = Math.max(5, Math.floor(this.attackInterval * (1 - missingPct)));
      }
      this.attackCooldown = interval;
      
      const bullets = [];
      const targetX = nearestEnemy.x;
      const targetY = nearestEnemy.y;
      
      // 多重射击逻辑 (扇形散射)
      const angleBase = Math.atan2(targetY - this.y, targetX - this.x);
      const spread = 0.2; // 散射弧度 (约10度)
      
      for (let i = 0; i < this.projectileCount; i++) {
        // 计算每发子弹的偏移角度
        let angleOffset = 0;
        if (this.projectileCount > 1) {
          angleOffset = (i - (this.projectileCount - 1) / 2) * spread;
        }
        
        // 反算一个假的 target
        const finalAngle = angleBase + angleOffset;
        const fakeTargetX = this.x + Math.cos(finalAngle) * 100;
        const fakeTargetY = this.y + Math.sin(finalAngle) * 100;

        // 判断是否暴击
        let isCrit = Math.random() < this.critRate;
        
        // 使用对象池获取子弹
        let b = pool.getItemByClass('bullet', Bullet, this.x, this.y, fakeTargetX, fakeTargetY, attackElement);
        b.isCrit = isCrit; // 标记暴击
        // 赋值穿透属性
        b.pierce = this.pierceCount;
        
        // 应用连锁
        let baseChain = this.chainCount;
        // ⚡️ 雷元素天生弹射
        if (this.currentElement === ElementType.LIGHTNING) {
          const lightningLv = this.elementLevels[ElementType.LIGHTNING] || 0;
          baseChain += (lightningLv >= 3 ? 2 : 1);
        }
        // 如果有风暴融合技，再 +2
        if (this.passives.fusion_storm) baseChain += 2;
        
        b.chain = baseChain;
        
        bullets.push(b);
      }

      return bullets;
    }

    return [];
  }
  
  render(ctx, img) {
    if (this.isDead) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // --- 新增：绘制阴影 ---
    ctx.save();
    ctx.scale(1, 0.5); // 压扁成椭圆
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(0, this.height, this.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // ---------------------
    
    // 受伤闪烁效果
    if (this.invincibleTime > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }
    
    if (img) {
      // 绘制图片 (居中)
      ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      // 没图时的备选方案
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(5, -5, 5, 5);
    }
    
    ctx.restore();
  }
}