import Joystick from './runtime/joystick.js';
import Hero from './player/hero.js';
import Enemy from './npc/enemy.js';
import Bullet from './weapon/bullet.js';
import EnemyBullet from './weapon/enemy_bullet.js';
import ExpOrb from './item/exp_orb.js';
import FloatingText from './ui/floating_text.js';
import Particle from './runtime/particle.js'; // 新增引入
import ElementalSystem from './core/elemental.js';
import { ElementType, ReactionType } from './base/constants.js';

// 游戏状态枚举
const GameState = {
  START: 'start', // 新增开始界面状态
  PLAYING: 'playing',
  LEVEL_UP: 'level_up',
  GAME_OVER: 'game_over',
  VICTORY: 'victory'
};

export default class Main {
  constructor() {
    // Canvas 初始化
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');
    const { screenWidth, screenHeight, devicePixelRatio } = wx.getSystemInfoSync();
    this.canvas.width = screenWidth * devicePixelRatio;
    this.canvas.height = screenHeight * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    // 实体
    this.joystick = new Joystick(screenWidth, screenHeight);
    
    // 实体列表（在 restart 里初始化）
    this.particles = []; // 新增粒子列表

    // 记录最高分 (本地存储)
    this.bestTime = wx.getStorageSync('bestTime') || 0;
    
    // 新增：震动参数
    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    this.state = GameState.START; // 默认进入标题页

    this.initTouchEvents();
    this.bindLoop = this.loop.bind(this);
    
    // 不再自动调用 restart，而是等待点击
    const raf = wx.requestAnimationFrame || requestAnimationFrame;
    raf(this.bindLoop, this.canvas);
  }

  initTouchEvents() {
    wx.onTouchStart((e) => {
      if (this.state === GameState.START) {
        this.restart(); // 点击标题开始游戏
      } else if (this.state === GameState.PLAYING) {
        this.joystick.onTouchStart(e);
      } else if (this.state === GameState.LEVEL_UP) {
        this.handleLevelUpTouch(e);
      } else if (this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) {
        this.state = GameState.START; // 游戏结束点击回标题
      }
    });
    
    wx.onTouchMove((e) => {
      if (this.state === GameState.PLAYING) {
        this.joystick.onTouchMove(e);
      }
    });
    
    wx.onTouchEnd((e) => {
      if (this.state === GameState.PLAYING) {
        this.joystick.onTouchEnd(e);
      }
    });
  }

  restart() {
    this.hero = new Hero(this.screenWidth, this.screenHeight);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.orbs = [];
    this.floatingTexts = [];
    this.particles = []; // 清空粒子

    this.frameCount = 0;
    this.state = GameState.PLAYING;
    this.level = 1;
    this.currentExp = 0;
    this.maxExp = 50;
    this.upgradeOptions = [];

    this.totalTime = 90; // 90秒一局
    this.currentTime = 0;
    this.lastTime = Date.now();
    this.bossSpawned = false;
    
    // 重置震动
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
  }
  
  // 新增：触发震动
  /**
   * @param {number} duration 震动持续帧数 (例如 10-20)
   * @param {number} intensity 震动幅度 (例如 5-10)
   */
  triggerShake(duration, intensity) {
    this.shakeTimer = duration;
    this.shakeIntensity = intensity;
  }
  
  // 辅助：生成爆炸粒子
  spawnExplosion(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }
  
  saveScore() {
    if (this.currentTime > this.bestTime) {
      this.bestTime = this.currentTime;
      wx.setStorageSync('bestTime', this.bestTime);
    }
  }

  spawnEnemy() {
    if (this.bossSpawned) return;
    
    // 定义波次配置
    // time: 开始时间(秒), end: 结束时间(秒), interval: 生成间隔(帧), types: 怪物池, limit: 同时存在最大数量
    const waves = [
      { time: 0,  end: 15, interval: 60, types: ['normal'], limit: 10 },            // 0-15秒: 只有小怪，慢
      { time: 15, end: 30, interval: 40, types: ['normal', 'charger'], limit: 15 }, // 15-30秒: 加入冲锋怪，变快
      { time: 30, end: 45, interval: 30, types: ['normal', 'normal', 'charger'], limit: 20 }, // 30-45秒: 刷怪加快
      { time: 45, end: 60, interval: 10, types: ['normal'], limit: 50 },            // 45-60秒: 怪物潮！全是小怪，极快
      { time: 60, end: 999, interval: 60, types: ['boss'], limit: 1 }               // 60秒: Boss
    ];
    
    // 找到当前对应的波次
    const currentWave = waves.find(w => this.currentTime >= w.time && this.currentTime < w.end);
    
    if (currentWave) {
      // 1. 检查数量限制
      if (this.enemies.length >= currentWave.limit) return;
      
      // 2. 生成怪物
      if (this.frameCount % currentWave.interval === 0) {
        const type = currentWave.types[Math.floor(Math.random() * currentWave.types.length)];
        
        // Boss 特殊处理
        if (type === 'boss') {
          if (!this.bossSpawned) {
            this.bossSpawned = true;
            this.enemies = []; // 清场
            this.floatingTexts.push(new FloatingText(
              this.screenWidth / 2, 
              150, 
              "BOSS WARNING!", 
              '#f1c40f',
              35
            ));
            this.enemies.push(new Enemy(this.screenWidth, this.screenHeight, 'boss'));
            this.triggerShake(60, 5); // Boss 出场震动
          }
        } else {
          this.enemies.push(new Enemy(this.screenWidth, this.screenHeight, type));
        }
      }
    }
    
    // 精英怪独立逻辑 (每30秒固定刷一只)
    if (this.currentTime > 0 && this.currentTime % 30 === 0 && this.frameCount % 60 === 0 && !this.bossSpawned) {
      this.floatingTexts.push(new FloatingText(
        this.screenWidth / 2, 
        100, 
        "ELITE APPEARED!", 
        '#8e44ad',
        30
      ));
      this.enemies.push(new Enemy(this.screenWidth, this.screenHeight, 'elite'));
      this.triggerShake(20, 3); // 精英出场小震动
    }
  }

  /**
   * 处理升级逻辑
   */
  checkLevelUp() {
    if (this.currentExp >= this.maxExp) {
      this.currentExp -= this.maxExp;
      this.level++;
      this.maxExp = Math.floor(this.maxExp * 1.5); // 下一级经验需求增加
      
      this.triggerLevelUp();
    }
  }

  triggerLevelUp() {
    this.state = GameState.LEVEL_UP;
    
    // 必须先定义这些变量，下面的 pool 数组和判断逻辑才能使用它们
    const lvFire = this.hero.elementLevels[ElementType.FIRE] || 0;
    const lvWater = this.hero.elementLevels[ElementType.WATER] || 0;
    const lvLightning = this.hero.elementLevels[ElementType.LIGHTNING] || 0;
    const lvIce = this.hero.elementLevels[ElementType.ICE] || 0;
    
    // 基础池
    const pool = [
      { id: 'fire', label: `火元素 (Lv.${lvFire+1})`, type: ElementType.FIRE, desc: '升级燃烧', weight: 10 },
      { id: 'ice', label: `冰元素 (Lv.${lvIce+1})`, type: ElementType.ICE, desc: '升级冻结', weight: 10 },
      { id: 'water', label: `水元素 (Lv.${lvWater+1})`, type: ElementType.WATER, desc: '升级水攻', weight: 10 },
      { id: 'lightning', label: `雷元素 (Lv.${lvLightning+1})`, type: ElementType.LIGHTNING, desc: '升级雷攻', weight: 10 },
      
      { id: 'multishot', label: '多重射击', type: 'buff_multishot', desc: '子弹数量 +1', weight: 5 },
      { id: 'pierce', label: '穿透子弹', type: 'buff_pierce', desc: '子弹可穿透 +1 个敌人', weight: 5 },
      { id: 'chain', label: '连锁闪电', type: 'buff_chain', desc: '+1 弹射', weight: 5 }, // 新增
      { id: 'magnet', label: '磁铁', type: 'buff_magnet', desc: '拾取范围 +50%', weight: 10 },
      
      { id: 'atk_spd', label: '攻速提升', type: 'buff_spd', desc: '射击速度 +15%', weight: 15 },
      { id: 'crit', label: '暴击率', type: 'buff_crit', desc: '暴击率 +10%', weight: 15 },
      { id: 'heal', label: '回复生命', type: 'buff_heal', desc: '回复 30% 生命值', weight: 15 }
    ];
    
    // 融合技 (Synergies)
    // 霜火 (Frostfire): 需要 火>=2 和 冰>=2
    if (lvFire >= 2 && lvIce >= 2 && !this.hero.passives.fusion_frostfire) {
      pool.push({ id: 'syn_frostfire', label: '【融合】霜火', type: 'syn_frostfire', desc: '冻结敌人受到剧烈燃烧', weight: 50 }); // 极高权重，有了必出
    }
    // 风暴之眼 (Storm): 需要 雷>=2 和 水>=2
    if (lvLightning >= 2 && lvWater >= 2 && !this.hero.passives.fusion_storm) {
      pool.push({ id: 'syn_storm', label: '【融合】风暴之眼', type: 'syn_storm', desc: '雷电连锁次数+2', weight: 50 });
    }
    
    // 基础被动
    if (lvIce > 0 && !this.hero.passives.shatter) {
      pool.push({ id: 'passive_shatter', label: '【被动】碎冰', type: 'passive_shatter', desc: '对冻结敌人必定暴击', weight: 8 });
    }
    
    if (!this.hero.passives.executioner) {
      pool.push({ id: 'passive_exec', label: '【被动】处刑者', type: 'passive_exec', desc: '对异常状态敌人伤害+50%', weight: 8 });
    }
    
    if ((lvFire > 0 || lvLightning > 0) && this.hero.passives.blast_radius === 0) {
      pool.push({ id: 'passive_blast', label: '【被动】热能激荡', type: 'passive_blast', desc: '爆炸范围 +50%', weight: 8 });
    }

    // 抽卡逻辑 (加权随机)
    this.upgradeOptions = [];
    const tempPool = [...pool];
    
    for (let i = 0; i < 3; i++) {
      if (tempPool.length === 0) break;
      
      // 简单的加权随机
      let totalWeight = tempPool.reduce((sum, item) => sum + item.weight, 0);
      let r = Math.random() * totalWeight;
      let selected = null;
      let acc = 0;
      
      for (let item of tempPool) {
        acc += item.weight;
        if (r < acc) {
          selected = item;
          break;
        }
      }
      
      if (selected) {
        this.upgradeOptions.push(selected);
        tempPool.splice(tempPool.indexOf(selected), 1);
      }
    }
    
    this.joystick.reset();
  }

  handleLevelUpTouch(e) {
    // 简单的点击判定：把屏幕横向分三份
    const touchX = e.changedTouches[0].clientX;
    const sectionWidth = this.screenWidth / 3;
    
    let selectedOption = null;

    if (touchX < sectionWidth) {
      selectedOption = this.upgradeOptions[0];
    } else if (touchX < sectionWidth * 2) {
      selectedOption = this.upgradeOptions[1];
    } else {
      selectedOption = this.upgradeOptions[2];
    }

    if (selectedOption) {
      this.applyUpgrade(selectedOption);
      this.state = GameState.PLAYING; // 恢复游戏
    }
  }

  applyUpgrade(option) {
    console.log("应用升级:", option.label);
    
    // 元素升级
    if ([ElementType.FIRE, ElementType.WATER, ElementType.LIGHTNING, ElementType.ICE].includes(option.type)) {
      this.hero.currentElement = option.type; // 切换当前武器
      this.hero.elementLevels[option.type]++; // 提升等级
    }
    // 被动升级
    else if (option.type === 'passive_shatter') {
      this.hero.passives.shatter = true;
    }
    else if (option.type === 'passive_exec') {
      this.hero.passives.executioner = true;
    }
    else if (option.type === 'passive_blast') {
      this.hero.passives.blast_radius = 50;
    }
    // 融合技
    else if (option.type === 'syn_frostfire') {
      this.hero.passives.fusion_frostfire = true;
    }
    else if (option.type === 'syn_storm') {
      this.hero.passives.fusion_storm = true;
    }
    // 基础 Buff
    else if (option.type === 'buff_multishot') {
      this.hero.projectileCount++;
    }
    else if (option.type === 'buff_pierce') {
      this.hero.pierceCount++;
    }
    else if (option.type === 'buff_chain') {
      this.hero.chainCount++;
    }
    else if (option.type === 'buff_spd') {
      this.hero.attackInterval = Math.max(5, Math.floor(this.hero.attackInterval * 0.85));
    }
    else if (option.type === 'buff_crit') {
      this.hero.critRate = Math.min(1.0, this.hero.critRate + 0.1);
    }
    else if (option.type === 'buff_heal') {
      this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + this.hero.maxHp * 0.3);
    }
    else if (option.type === 'buff_magnet') {
      this.hero.pickupRange += 50;
    }
  }

  checkCollisions() {
    // 1. 子弹打敌人
    for (let bullet of this.bullets) {
      if (!bullet.active) continue;
      
      // 用来记录是否发生过碰撞，方便处理弹射
      let hitSomething = false;
      
      for (let enemy of this.enemies) {
        if (!enemy.active) continue;
        if (bullet.hitList.includes(enemy.id)) continue;
        
        const dist = Math.sqrt((bullet.x - enemy.x)**2 + (bullet.y - enemy.y)**2);
        if (dist < (enemy.width/2 + 5)) {
          // 命中！
          bullet.hitList.push(enemy.id);
          hitSomething = true;
          
          // 生成一点点火花粒子
          this.spawnExplosion(bullet.x, bullet.y, '#ffff00', 3);
          
          // 1. 伤害计算
          let damage = 2; // 基础伤害
          
          // 【被动】碎冰：如果敌人冻结，必定暴击
          if (this.hero.passives.shatter && enemy.freezeTimer > 0) {
            bullet.isCrit = true;
          }
          
          // 暴击计算
          let isCrit = bullet.isCrit; // 从子弹获取
          if (isCrit) {
            damage *= 2.0; // 暴击 200% 伤害
          }
          
          // 【被动】处刑者：如果敌人有附着元素、燃烧或冻结，伤害加成
          if (this.hero.passives.executioner) {
            if (enemy.attachedElement !== ElementType.NONE || enemy.burnTimer > 0 || enemy.freezeTimer > 0) {
              damage *= 1.5;
            }
          }
          
          // 【融合技：霜火】冻结敌人受到额外火伤
          if (this.hero.passives.fusion_frostfire && enemy.freezeTimer > 0) {
            damage += 5; // 额外附加直伤
            // 强制触发燃烧
            enemy.burnTimer = 90;
            enemy.burnDamage = Math.max(1, Math.floor(damage * 0.3));
          }
          
          // 传入 hero.elementLevels 进行计算
          const result = ElementalSystem.calculate(
            enemy.attachedElement, 
            bullet.elementType, 
            damage, 
            this.hero.elementLevels // 传入等级
          );
          
          // 应用效果
          if (result.effect) {
            if (result.effect.type === 'burn') {
              enemy.burnTimer = result.effect.duration;
              enemy.burnDamage = result.effect.damage;
            } else if (result.effect.type === 'freeze') {
              enemy.freezeTimer = result.effect.duration;
            }
          }
          
          enemy.hp -= result.damage;
          enemy.attachedElement = result.remainingElement;
          
          // 飘字
          let textType = 'normal';
          if (result.reaction !== ReactionType.NONE || bullet.isCrit) textType = 'crit';
          
          if (result.reaction === ReactionType.FREEZE) {
            this.floatingTexts.push(new FloatingText(
              enemy.x, 
              enemy.y - 20, 
              "FREEZE!", 
              '#74b9ff',
              24
            ));
          } else {
            this.floatingTexts.push(new FloatingText(
              enemy.x, 
              enemy.y - 20, 
              `-${result.damage.toFixed(0)}`, 
              isCrit ? '#ff0000' : '#ffffff',
              textType === 'crit' ? 28 : 24
            ));
          }
          
          // AOE 效果
          if (result.reaction === ReactionType.OVERLOAD || result.reaction === ReactionType.SUPERCONDUCT) {
            // 【被动】热能激荡：增加范围
            let range = (result.aoeRange || 100) + this.hero.passives.blast_radius;
            this.handleOverloadAoE(enemy.x, enemy.y, range, result.aoeDamage || damage * 0.5);
            this.spawnExplosion(enemy.x, enemy.y, '#9b59b6', 15);
            this.triggerShake(10, 5); // 小震动
          }
          
          if (enemy.hp <= 0) {
            this.killEnemy(enemy);
          }
          
          // 2. 穿透与弹射逻辑判断
          // 优先级：弹射 > 穿透
          if (bullet.chain > 0) {
            // 触发弹射
            bullet.chain--;
            const nextTarget = this.findNearestEnemy(enemy.x, enemy.y, bullet.hitList);
            if (nextTarget) {
              bullet.redirect(nextTarget.x, nextTarget.y);
              // 弹射不消耗 pierce，但也不销毁
            } else {
              // 没怪可弹了，按照普通子弹处理 (检查 pierce)
              if (bullet.pierce > 0) {
                bullet.pierce--;
              } else {
                bullet.active = false;
              }
            }
          } else {
            // 普通穿透逻辑
            if (bullet.pierce > 0) {
              bullet.pierce--;
            } else {
              bullet.active = false;
            }
          }
          
          break; // 这一帧只处理这一个碰撞 (防止瞬间判定多个)
        }
      }
    }
    
    // 2. 敌人子弹打玩家 (新增)
    for (let eb of this.enemyBullets) {
      if (!eb.active) continue;
      const dist = Math.sqrt((eb.x - this.hero.x)**2 + (eb.y - this.hero.y)**2);
      if (dist < 15) { // 判定范围
        eb.active = false;
        this.hero.takeDamage(eb.damage);
        this.floatingTexts.push(new FloatingText(
          this.hero.x, 
          this.hero.y, 
          `-${eb.damage}`, 
          '#e74c3c',
          20
        ));
        // 玩家受伤粒子
        this.spawnExplosion(this.hero.x, this.hero.y, '#ff0000', 5);
        this.triggerShake(15, 10); // 中震动
      }
    }

    // 3. 玩家吃经验球
    for (let orb of this.orbs) {
      if (!orb.active) continue;
      const dist = Math.sqrt((orb.x - this.hero.x)**2 + (orb.y - this.hero.y)**2);
      // 吸收范围
      if (dist < 30) {
        orb.active = false;
        this.currentExp += orb.value;
        this.checkLevelUp();
      }
    }
    
    // 4. 敌人撞玩家
    for (let enemy of this.enemies) {
      if (!enemy.active) continue;
      
      const dist = Math.sqrt((enemy.x - this.hero.x)**2 + (enemy.y - this.hero.y)**2);
      // 简单的圆形碰撞 (假设主角半径20, 敌人半径 width/2)
      if (dist < (20 + enemy.width / 2)) {
        this.hero.takeDamage(enemy.damage);
        this.triggerShake(20, 8); // 大震动
      }
    }
  }
  
  // 辅助：寻找最近的 *未命中过* 的敌人
  findNearestEnemy(x, y, ignoreIds) {
    let nearest = null;
    let minDist = 300; // 弹射索敌范围
    for (let e of this.enemies) {
      if (!e.active || ignoreIds.includes(e.id)) continue;
      const d = Math.sqrt((e.x - x)**2 + (e.y - y)**2);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }
    return nearest;
  }
  
  /**
   * 处理 Overload 的 AoE 爆炸效果
   */
  handleOverloadAoE(centerX, centerY, radius, damage) {
    // 对范围内的所有敌人造成伤害
    for (let enemy of this.enemies) {
      if (!enemy.active) continue;
      
      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= radius) {
        enemy.hp -= damage;
        
        // 显示 AoE 伤害数字（较小）
        this.floatingTexts.push(new FloatingText(
          enemy.x,
          enemy.y - 20,
          `-${damage.toFixed(0)}`,
          '#f39c12',
          18
        ));
        
        if (enemy.hp <= 0) {
          this.killEnemy(enemy);
        }
      }
    }
    
    // 可选：添加爆炸视觉效果（暂时用文字提示）
    this.floatingTexts.push(new FloatingText(
      centerX,
      centerY - 40,
      'BOOM!',
      '#f39c12',
      30
    ));
  }
  
  killEnemy(enemy) {
    enemy.active = false;
    // 敌人死亡粒子
    this.spawnExplosion(enemy.x, enemy.y, enemy.color, 10);
    
    // 根据敌人类型掉落经验
    let expValue = 20;
    if (enemy.type === 'elite') expValue = 100;
    if (enemy.type === 'boss') expValue = 1000;
    else if (enemy.type === 'charger') expValue = 30;
    this.orbs.push(new ExpOrb(enemy.x, enemy.y, expValue));
    
    // 如果 Boss 死了，直接胜利 (延迟一点)
    if (enemy.type === 'boss') {
      this.saveScore(); // 胜利保存
      setTimeout(() => { this.state = GameState.VICTORY; }, 1000);
    }
  }

  update() {
    // 如果不是 PLAYING 状态，不更新游戏逻辑
    if (this.state !== GameState.PLAYING) return;

    // 计算时间
    const now = Date.now();
    const dt = (now - this.lastTime) / 1000;
    if (dt >= 1) {
      this.currentTime += 1;
      this.lastTime = now;
    }
    
    // 检查游戏结束
    if (this.hero.isDead) {
      this.saveScore(); // 死亡保存
      this.state = GameState.GAME_OVER;
    }
    // 检查胜利 (时间到了且 Boss 还没出，或者 Boss 已死)
    if (this.currentTime >= this.totalTime && !this.bossSpawned) {
      this.saveScore();
      this.state = GameState.VICTORY; 
    }

    this.frameCount++;
    const input = this.joystick.getInputVector();
    this.hero.update(input);

    // 玩家射击 (改为接收数组)
    const newBullets = this.hero.tryAttack(this.enemies);
    if (newBullets && newBullets.length > 0) {
      this.bullets.push(...newBullets); // 展开数组推入
    }

    this.spawnEnemy();
    
    // 敌人生成与更新（Boss 会返回子弹数组）
    this.enemies.forEach(e => {
      const result = e.update(this.hero);
      if (result) {
        // 处理敌人燃烧扣血导致的死亡（优先检查，因为死亡后不会返回子弹）
        if (result.diedByDot) {
          // 燃烧死亡掉落
          let exp = 20;
          if (e.type === 'elite') exp = 100;
          else if (e.type === 'charger') exp = 30;
          this.orbs.push(new ExpOrb(e.x, e.y, exp));
          // 飘字
          this.floatingTexts.push(new FloatingText(e.x, e.y - 20, "Burn", '#e67e22', 20));
        }
        // Boss 子弹（Boss不会被烧死，所以可以安全检查）
        else if (result.bullets && result.bullets.length > 0) {
          this.enemyBullets.push(...result.bullets);
        }
      }
    });
    
    this.bullets.forEach(b => b.update());
    this.enemyBullets.forEach(eb => eb.update()); // 更新敌人子弹
    this.orbs.forEach(o => o.update(this.hero)); // 更新经验球
    this.floatingTexts.forEach(ft => ft.update()); // 更新浮动文字
    
    // 粒子更新
    this.particles.forEach(p => p.update());

    this.checkCollisions();

    // 清理
    this.enemies = this.enemies.filter(e => e.active);
    this.bullets = this.bullets.filter(b => b.active);
    this.enemyBullets = this.enemyBullets.filter(eb => eb.active);
    this.orbs = this.orbs.filter(o => o.active);
    this.floatingTexts = this.floatingTexts.filter(ft => ft.active);
    this.particles = this.particles.filter(p => p.life > 0); // 清理粒子
  }

  render() {
    // 全局背景色
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 如果是 START 界面
    if (this.state === GameState.START) {
      this.renderStartScreen();
      return;
    }

    // 游戏内渲染
    this.orbs.forEach(o => o.render(this.ctx));
    this.enemies.forEach(e => e.render(this.ctx));
    this.bullets.forEach(b => b.render(this.ctx));
    this.enemyBullets.forEach(eb => eb.render(this.ctx));
    this.hero.render(this.ctx);
    
    // 粒子渲染
    this.particles.forEach(p => p.render(this.ctx));
    
    this.floatingTexts.forEach(ft => ft.render(this.ctx));
    this.joystick.render(this.ctx);
    this.renderHUD();

    if (this.state === GameState.LEVEL_UP) {
      this.renderLevelUpUI();
    }
    if (this.state === GameState.GAME_OVER) {
      this.renderGameOverUI();
    }
    if (this.state === GameState.VICTORY) {
      this.renderVictoryUI();
    }
    
    // 4. 恢复画布
    this.ctx.restore();
  }
  
  renderStartScreen() {
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    this.ctx.fillStyle = '#f1c40f';
    this.ctx.font = 'bold 40px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ELEMENTAL SURVIVOR', this.screenWidth / 2, this.screenHeight / 2 - 40);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px Arial';
    this.ctx.fillText('Tap to Start', this.screenWidth / 2, this.screenHeight / 2 + 20);

    // 显示最高分
    this.ctx.fillStyle = '#bdc3c7';
    this.ctx.font = '16px Arial';
    const bestMins = Math.floor(this.bestTime / 60).toString().padStart(2, '0');
    const bestSecs = (this.bestTime % 60).toString().padStart(2, '0');
    this.ctx.fillText(`Best Time: ${bestMins}:${bestSecs}`, this.screenWidth / 2, this.screenHeight / 2 + 60);
  }

  renderHUD() {
    // 1. 经验条 (顶部)
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.screenWidth, 10);
    this.ctx.fillStyle = '#2ecc71';
    const expPct = Math.min(1, this.currentExp / this.maxExp);
    this.ctx.fillRect(0, 0, this.screenWidth * expPct, 10);
    
    // 2. 倒计时 (顶部居中)
    const remaining = this.totalTime - this.currentTime;
    const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
    const secs = (remaining % 60).toString().padStart(2, '0');
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${mins}:${secs}`, this.screenWidth / 2, 35);
    
    // 3. 等级文字 (右上角)
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`LV. ${this.level}`, this.screenWidth - 10, 35);
    
    // 4. 血条 (底部中间)
    const hpBarWidth = 200;
    const hpBarHeight = 20;
    const hpX = (this.screenWidth - hpBarWidth) / 2;
    const hpY = this.screenHeight - 40;
    
    // 背景
    this.ctx.fillStyle = '#555';
    this.ctx.fillRect(hpX, hpY, hpBarWidth, hpBarHeight);
    // 血量
    this.ctx.fillStyle = '#e74c3c';
    const hpPct = Math.max(0, this.hero.hp / this.hero.maxHp);
    this.ctx.fillRect(hpX, hpY, hpBarWidth * hpPct, hpBarHeight);
    // 边框
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(hpX, hpY, hpBarWidth, hpBarHeight);
    
    // 文字
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${Math.ceil(this.hero.hp)}/${this.hero.maxHp}`, this.screenWidth / 2, hpY + 15);
  }

  renderLevelUpUI() {
    // 半透明黑色遮罩
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 标题
    this.ctx.fillStyle = '#f1c40f'; // 金色
    this.ctx.font = 'bold 30px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('LEVEL UP!', this.screenWidth / 2, 80);
    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('Choose an Upgrade', this.screenWidth / 2, 120);

    // 绘制三个选项卡
    const margin = 20;
    const cardWidth = (this.screenWidth - margin * 4) / 3;
    const cardHeight = 200;
    const cardY = 150;

    this.upgradeOptions.forEach((opt, index) => {
      const cardX = margin + index * (cardWidth + margin);
      
      // 卡片背景
      this.ctx.fillStyle = '#ecf0f1';
      this.ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
      
      // 选项文字
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.font = 'bold 18px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(opt.label, cardX + cardWidth / 2, cardY + 50);
      
      // 描述
      this.ctx.font = '14px Arial';
      this.ctx.fillStyle = '#7f8c8d';
      this.renderWrapText(opt.desc, cardX + cardWidth / 2, cardY + 100, cardWidth - 20, 20);
    });
  }

  // 辅助：文字换行 (简单版)
  renderWrapText(text, x, y, maxWidth, lineHeight) {
    // 暂时只画一行，复杂换行以后再说
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y);
  }
  
  renderGameOverUI() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.font = 'bold 40px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.screenWidth / 2, this.screenHeight / 2 - 20);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px Arial';
    this.ctx.fillText('Tap to Return Title', this.screenWidth / 2, this.screenHeight / 2 + 40);
  }
  
  renderVictoryUI() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    
    this.ctx.fillStyle = '#f1c40f';
    this.ctx.font = 'bold 40px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('VICTORY!', this.screenWidth / 2, this.screenHeight / 2 - 20);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px Arial';
    this.ctx.fillText('You Defeated the Boss!', this.screenWidth / 2, this.screenHeight / 2 + 20);
    this.ctx.fillText('Tap to Return Title', this.screenWidth / 2, this.screenHeight / 2 + 50);
  }

  loop() {
    // console.log("Loop is running"); // 如果控制台疯狂刷屏这句话，说明循环是好的，那就是渲染问题
    // 即使暂停也要 requestAnimationFrame 才能维持画面渲染（虽然 update 停了）
    this.update();
    this.render();
    const raf = wx.requestAnimationFrame || requestAnimationFrame;
    raf(this.bindLoop, this.canvas);
  }
}
