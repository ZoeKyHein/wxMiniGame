import Bullet from '../weapon/bullet.js';
import { ElementType } from '../base/constants.js'; // 引入常量
import { pool } from '../base/pool.js'; // 引入对象池
import { audio } from '../base/audio.js'; // 引入音频管理器

export default class Hero {
  constructor(screenWidth, screenHeight, worldWidth, worldHeight, config = {}) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.x = worldWidth / 2;
    this.y = worldHeight / 2;
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
    
    // --- 新增：Hook 系统 ---
    this.hooks = {
      onHit: [],          // 击中敌人时
      onKill: [],         // 击杀敌人时
      onTakeDamage: [],   // 受伤时
      onUpdate: [],       // 每帧
      onAttack: [],       // 攻击/射击时
      onDamageDealt: [],  // 造成伤害时
      onCrit: [],         // 暴击时
      onMove: []          // 移动时
    };
    
    // 新增通用属性，供道具修改
    this.luck = 0;
    this.expMultiplier = 1;
    this.scale = 1; // 体型
    this.damageReduction = 0;
    this.shield = 0;
    this.maxShield = 0;
    this.killStack = 0;
    this.lastMoveX = 0;
    this.lastMoveY = 0;
    
    // --- 程序化动画 ---
    this.walkCycle = 0; // 走路循环计数
  }
  
  // 注册 Hook
  addHook(eventName, callback) {
    if (this.hooks[eventName]) {
      this.hooks[eventName].push(callback);
    }
  }
  
  // 触发 Hook
  triggerHooks(eventName, ...args) {
    if (this.hooks[eventName]) {
      // 构建上下文，让道具能访问游戏全局数据
      const ctx = {
        hero: this,
        game: this.gameInstance || window.gameInstance,
        frameCount: this.frameCount || 0,
        utils: {
          getDist: (a, b) => Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2)
        }
      };
      
      this.hooks[eventName].forEach(cb => {
        try {
          cb(ctx, ...args);
        } catch (e) {
          console.error('Hook error:', e);
        }
      });
    }
  }

  update(inputVector) {
    // 移动逻辑保持不变
    if (inputVector.x !== 0 || inputVector.y !== 0) {
      const moveX = inputVector.x * this.speed;
      const moveY = inputVector.y * this.speed;
      this.lastMoveX = moveX; // 记录移动量，用于减速区域
      this.lastMoveY = moveY;
      this.x += moveX;
      this.y += moveY;
      // 边界限制：改为 WorldWidth
      if (this.x < 20) this.x = 20; // 留点边距
      if (this.y < 20) this.y = 20;
      if (this.x > this.worldWidth - 20) this.x = this.worldWidth - 20;
      if (this.y > this.worldHeight - 20) this.y = this.worldHeight - 20;
    } else {
      this.lastMoveX = 0;
      this.lastMoveY = 0;
    }
    
    if (this.attackCooldown > 0) this.attackCooldown--;
    
    // --- 新增：无敌帧递减 ---
    if (this.invincibleTime > 0) this.invincibleTime--;
    
    // 触发更新 Hook
    this.triggerHooks('onUpdate');
    
    // 触发移动 Hook
    if (inputVector.x !== 0 || inputVector.y !== 0) {
      this.triggerHooks('onMove');
      // 更新走路循环
      this.walkCycle += 0.2;
    } else {
      // 站立时逐渐归位
      this.walkCycle *= 0.9;
    }
  }
  
  /**
   * 受到伤害
   * @returns {boolean} 是否真正受到了伤害
   */
  takeDamage(amount, attacker = null) {
    if (this.invincibleTime > 0 || this.isDead) return false;

    // 应用伤害减免
    const finalAmount = Math.floor(amount * (1 - (this.damageReduction || 0)));
    
    // 先扣护盾
    if (this.shield > 0) {
      const shieldDamage = Math.min(this.shield, finalAmount);
      this.shield -= shieldDamage;
      const remainingDamage = finalAmount - shieldDamage;
      if (remainingDamage > 0) {
        this.hp -= remainingDamage;
      }
    } else {
      this.hp -= finalAmount;
    }
    
    this.invincibleTime = 30; // 被打后有0.5秒无敌时间（假设60fps）
    
    // 触发受伤 Hook
    this.triggerHooks('onTakeDamage', attacker, finalAmount);
    
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
      
      // 根据元素类型播放不同的射击音效（启用音高随机化）
      let soundName = 'shoot_normal';
      if (attackElement === ElementType.FIRE) soundName = 'shoot_fire';
      else if (attackElement === ElementType.ICE) soundName = 'shoot_ice';
      else if (attackElement === ElementType.LIGHTNING) soundName = 'shoot_lightning';
      else if (attackElement === ElementType.WATER) soundName = 'shoot_water';
      
      // 射击音效启用音高随机化，防止听觉疲劳
      audio.play(soundName, true);

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