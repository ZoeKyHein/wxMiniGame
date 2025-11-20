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
    
    // --- 新增：战斗属性 ---
    this.projectileCount = 1; // 子弹数量
    this.critRate = 0;        // 暴击率 (0 ~ 1)
    
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
      this.attackCooldown = this.attackInterval;
      
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
        
        let b = new Bullet(this.x, this.y, fakeTargetX, fakeTargetY, this.currentElement);
        b.isCrit = isCrit; // 标记暴击
        // 赋值穿透属性
        b.pierce = this.pierceCount;
        
        // 应用连锁
        // 如果是雷元素，天生 +1 连锁
        let baseChain = this.chainCount;
        if (this.currentElement === ElementType.LIGHTNING) baseChain += 1;
        // 如果有风暴融合技，再 +2
        if (this.passives.fusion_storm) baseChain += 2;
        
        b.chain = baseChain;
        
        bullets.push(b);
      }

      return bullets;
    }

    return [];
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