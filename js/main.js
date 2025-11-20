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
    // Boss 阶段不刷小怪，或者少刷
    if (this.bossSpawned) return; 

    let spawnRate = 60;
    if (this.currentTime > 30) spawnRate = 40;

    if (this.frameCount % spawnRate === 0) {
      // 20% 几率生成冲锋怪
      if (Math.random() < 0.2) {
        this.enemies.push(new Enemy(this.screenWidth, this.screenHeight, 'charger'));
      } else {
        this.enemies.push(new Enemy(this.screenWidth, this.screenHeight, 'normal'));
      }
    }

    // 精英怪：第 30 秒
    if (this.currentTime === 30 && this.frameCount % 60 === 0) {
      this.floatingTexts.push(new FloatingText(
        this.screenWidth / 2, 
        100, 
        "ELITE APPEARED!", 
        '#8e44ad',
        30
      ));
      this.enemies.push(new Enemy(this.screenWidth, this.screenHeight, 'elite'));
    }

    // Boss：第 60 秒
    if (this.currentTime === 60 && !this.bossSpawned) {
      this.bossSpawned = true;
      this.enemies = []; // (可选) 清空小怪，单挑 Boss
      this.floatingTexts.push(new FloatingText(
        this.screenWidth / 2, 
        150, 
        "BOSS WARNING!", 
        '#f1c40f',
        35
      ));
      this.enemies.push(new Enemy(this.screenWidth, this.screenHeight, 'boss'));
      console.log("Boss 生成！");
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
    
    const currentFireLv = this.hero.elementLevels[ElementType.FIRE];
    const currentIceLv = this.hero.elementLevels[ElementType.ICE];
    const currentWaterLv = this.hero.elementLevels[ElementType.WATER];
    const currentLightningLv = this.hero.elementLevels[ElementType.LIGHTNING];
    
    // 基础池
    const pool = [
      { id: 'fire', label: `火元素 (Lv.${currentFireLv+1})`, type: ElementType.FIRE, desc: '升级燃烧伤害', weight: 10 },
      { id: 'water', label: `水元素 (Lv.${currentWaterLv+1})`, type: ElementType.WATER, desc: '切换/升级水属性', weight: 10 },
      { id: 'lightning', label: `雷元素 (Lv.${currentLightningLv+1})`, type: ElementType.LIGHTNING, desc: '切换/升级雷属性', weight: 10 },
      { id: 'ice', label: `冰元素 (Lv.${currentIceLv+1})`, type: ElementType.ICE, desc: '升级冻结时长', weight: 10 },
      
      { id: 'multishot', label: '多重射击', type: 'buff_multishot', desc: '子弹数量 +1', weight: 5 },
      { id: 'pierce', label: '穿透子弹', type: 'buff_pierce', desc: '子弹可穿透 +1 个敌人', weight: 5 },
      { id: 'magnet', label: '磁铁', type: 'buff_magnet', desc: '拾取范围 +50%', weight: 10 },
      
      { id: 'atk_spd', label: '攻速提升', type: 'buff_spd', desc: '射击速度 +15%', weight: 15 },
      { id: 'crit', label: '暴击率', type: 'buff_crit', desc: '暴击率 +10%', weight: 15 },
      { id: 'heal', label: '回复生命', type: 'buff_heal', desc: '回复 30% 生命值', weight: 15 }
    ];
    
    // 新增：圣遗物 (Synergy Passives)
    // 碎冰：需要有冰元素等级
    if (this.hero.elementLevels[ElementType.ICE] > 0 && !this.hero.passives.shatter) {
      pool.push({ id: 'passive_shatter', label: '【被动】碎冰', type: 'passive_shatter', desc: '对冻结敌人必定暴击', weight: 8 });
    }
    
    // 处刑者：通用
    if (!this.hero.passives.executioner) {
      pool.push({ id: 'passive_exec', label: '【被动】处刑者', type: 'passive_exec', desc: '对异常状态敌人伤害+50%', weight: 8 });
    }
    
    // 热能激荡：需要火或雷
    if ((this.hero.elementLevels[ElementType.FIRE] > 0 || this.hero.elementLevels[ElementType.LIGHTNING] > 0) && this.hero.passives.blast_radius === 0) {
      pool.push({ id: 'passive_blast', label: '【被动】热能激荡', type: 'passive_blast', desc: '爆炸范围 +50%', weight: 8 });
    }

    // 随机抽取 3 个不重复的选项
    this.upgradeOptions = [];
    const tempPool = [...pool];
    
    for (let i = 0; i < 3; i++) {
      if (tempPool.length === 0) break;
      const randomIndex = Math.floor(Math.random() * tempPool.length);
      this.upgradeOptions.push(tempPool[randomIndex]);
      tempPool.splice(randomIndex, 1); // 抽走，防止重复
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
    // 基础 Buff
    else if (option.type === 'buff_multishot') {
      this.hero.projectileCount++;
    }
    else if (option.type === 'buff_pierce') {
      this.hero.pierceCount++;
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
      
      for (let enemy of this.enemies) {
        if (!enemy.active) continue;
        
        // 检查是否已经打过这个怪
        if (bullet.hitList.includes(enemy.id)) continue;
        
        const dist = Math.sqrt((bullet.x - enemy.x)**2 + (bullet.y - enemy.y)**2);
        if (dist < (enemy.width/2 + 5)) {
          // 记录命中
          bullet.hitList.push(enemy.id);
          
          // 检查穿透次数
          if (bullet.pierce > 0) {
            bullet.pierce--;
            // 子弹继续飞行，不销毁
          } else {
            bullet.active = false; // 次数用尽，销毁
          }
          
          // 生成一点点火花粒子
          this.spawnExplosion(bullet.x, bullet.y, '#ffff00', 3);
          
          // 伤害计算升级
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
          
          // 传入 hero.elementLevels 进行计算
          const result = ElementalSystem.calculate(
            enemy.attachedElement, 
            bullet.elementType, 
            damage, 
            this.hero.elementLevels // 传入等级
          );
          
          // 应用燃烧
          if (result.effect && result.effect.type === 'burn') {
            enemy.burnTimer = result.effect.duration;
            enemy.burnDamage = result.effect.damage;
          }
          
          // 应用冻结
          if (result.effect && result.effect.type === 'freeze') {
            enemy.freezeTimer = result.effect.duration;
          }
          
          enemy.hp -= result.damage;
          enemy.attachedElement = result.remainingElement;
          
          // 飘字逻辑
          let textType = 'normal';
          if (result.reaction !== ReactionType.NONE) textType = 'crit'; // 反应算大字
          if (isCrit) textType = 'crit'; // 暴击也算大字
          
          // 如果是冻结，飘蓝字
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
          }
          
          if (enemy.hp <= 0) {
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
          
          // 如果子弹已经销毁 (pierce用完)，跳出 inner loop
          if (!bullet.active) break;
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
      }
    }
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
          enemy.active = false;
          // 根据敌人类型掉落经验
          let expValue = 20;
          if (enemy.type === 'elite') expValue = 100;
          if (enemy.type === 'boss') expValue = 1000; // Boss 巨额经验
          this.orbs.push(new ExpOrb(enemy.x, enemy.y, expValue));
          
          // 如果 Boss 死了，直接胜利
          if (enemy.type === 'boss') {
            setTimeout(() => { this.state = GameState.VICTORY; }, 1000);
          }
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
