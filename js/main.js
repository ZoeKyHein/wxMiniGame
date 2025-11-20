import Joystick from './runtime/joystick.js';
import Hero from './player/hero.js';
import Enemy from './npc/enemy.js';
import Bullet from './weapon/bullet.js';
import EnemyBullet from './weapon/enemy_bullet.js'; // 引入
import ExpOrb from './item/exp_orb.js';
import FloatingText from './ui/floating_text.js';
import ElementalSystem from './core/elemental.js';
import { ElementType, ReactionType } from './base/constants.js';

// 游戏状态枚举
const GameState = {
  PLAYING: 'playing',
  LEVEL_UP: 'level_up',
  GAME_OVER: 'game_over',
  VICTORY: 'victory' // 新增胜利状态
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
    this.hero = new Hero(screenWidth, screenHeight);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = []; // 新增：敌人子弹列表
    this.orbs = []; // 经验球列表
    this.floatingTexts = []; // 浮动文字列表

    // 游戏数据
    this.frameCount = 0;
    this.state = GameState.PLAYING;
    
    this.level = 1;
    this.currentExp = 0;
    this.maxExp = 50; // 第一级只需要50经验
    
    // 升级选项 (临时存储)
    this.upgradeOptions = [];
    
    // 时间控制
    this.totalTime = 90; // 改成 90秒 (1分半) 方便测试 Boss
    this.currentTime = 0;     // 当前经过时间 (秒)
    this.lastTime = Date.now();
    this.bossSpawned = false; // 标记 Boss 是否已生成

    this.initTouchEvents();
    this.bindLoop = this.loop.bind(this);
    this.restart();
    
    // --- 补上这一行，启动引擎！---
    const raf = wx.requestAnimationFrame || requestAnimationFrame;
    raf(this.bindLoop, this.canvas);
  }

  initTouchEvents() {
    wx.onTouchStart((e) => {
      if (this.state === GameState.PLAYING) {
        this.joystick.onTouchStart(e);
      } else if (this.state === GameState.LEVEL_UP) {
        this.handleLevelUpTouch(e);
      } else if (this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) {
        this.restart(); // 点击重开
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
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = []; // 清空
    this.orbs = [];
    this.floatingTexts = [];
    this.hero = new Hero(this.screenWidth, this.screenHeight); // 重置主角
    this.frameCount = 0;
    this.state = GameState.PLAYING;
    this.level = 1;
    this.currentExp = 0;
    this.maxExp = 50;
    
    this.currentTime = 0;
    this.lastTime = Date.now();
    this.bossSpawned = false;
  }

  spawnEnemy() {
    // Boss 阶段不刷小怪，或者少刷
    if (this.bossSpawned) return; 

    let spawnRate = 60;
    if (this.currentTime > 30) spawnRate = 40;

    if (this.frameCount % spawnRate === 0) {
      this.enemies.push(new Enemy(this.screenWidth, this.screenHeight, 'normal'));
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
    // 生成3个选项（随机包含元素和属性升级）
    const allOptions = [
      { id: 1, label: '火元素附魔', type: ElementType.FIRE, desc: '攻击变为火属性' },
      { id: 2, label: '水元素附魔', type: ElementType.WATER, desc: '攻击变为水属性' },
      { id: 3, label: '雷元素附魔', type: ElementType.LIGHTNING, desc: '攻击变为雷属性' },
      { id: 4, label: '攻速提升', type: 'atk_spd', desc: '射击间隔减少 20%' }
    ];
    
    // 随机选择3个选项（确保至少有一个元素选项）
    const elementOptions = allOptions.filter(opt => 
      opt.type === ElementType.FIRE || 
      opt.type === ElementType.WATER || 
      opt.type === ElementType.LIGHTNING
    );
    const otherOptions = allOptions.filter(opt => opt.type === 'atk_spd');
    
    // 至少选择一个元素，然后随机填充其他选项
    const selected = [elementOptions[Math.floor(Math.random() * elementOptions.length)]];
    const remaining = [...elementOptions.filter(opt => opt.id !== selected[0].id), ...otherOptions];
    
    // 随机打乱并选择2个
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    
    this.upgradeOptions = [...selected, ...remaining.slice(0, 2)];
    
    // 每次升级重置摇杆，防止卡住
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
    console.log("选择了升级:", option.label);
    if (option.type === ElementType.FIRE || 
        option.type === ElementType.WATER || 
        option.type === ElementType.LIGHTNING) {
      this.hero.currentElement = option.type;
    } else if (option.type === 'atk_spd') {
      this.hero.attackInterval = Math.max(5, Math.floor(this.hero.attackInterval * 0.8));
    }
  }

  checkCollisions() {
    // 1. 子弹打敌人
    for (let bullet of this.bullets) {
      if (!bullet.active) continue;
      for (let enemy of this.enemies) {
        if (!enemy.active) continue;
        const dist = Math.sqrt((bullet.x - enemy.x)**2 + (bullet.y - enemy.y)**2);
        if (dist < (enemy.width/2 + 5)) { // 稍微调整碰撞半径适应不同大小的怪
          bullet.active = false;
          const baseDamage = 2; // 基础伤害
          const result = ElementalSystem.calculate(enemy.attachedElement, bullet.elementType, baseDamage);
          enemy.hp -= result.damage;
          enemy.attachedElement = result.remainingElement;
          
          // 显示伤害数字
          let damageColor = '#ffffff';
          let damageText = `-${result.damage.toFixed(0)}`;
          
          // 如果有反应，显示反应名称和特殊颜色
          if (result.reaction !== ReactionType.NONE) {
            damageColor = ElementalSystem.getReactionColor(result.reaction);
            if (result.reaction === ReactionType.VAPORIZE) {
              damageText = `蒸发! -${result.damage.toFixed(0)}`;
            } else if (result.reaction === ReactionType.OVERLOAD) {
              damageText = `超载! -${result.damage.toFixed(0)}`;
            }
          }
          
          this.floatingTexts.push(new FloatingText(
            enemy.x, 
            enemy.y - 20, 
            damageText, 
            damageColor,
            24
          ));
          
          // 处理 Overload AoE 效果
          if (result.reaction === ReactionType.OVERLOAD && result.isAoE) {
            this.handleOverloadAoE(enemy.x, enemy.y, result.aoeRadius, result.aoeDamage);
          }
          
          if (enemy.hp <= 0) {
            enemy.active = false;
            // 根据敌人类型掉落经验
            let expValue = 20;
            if (enemy.type === 'elite') expValue = 100;
            if (enemy.type === 'boss') expValue = 1000; // Boss 巨额经验
            this.orbs.push(new ExpOrb(enemy.x, enemy.y, expValue));
            
            // 如果 Boss 死了，直接胜利 (延迟一点)
            if (enemy.type === 'boss') {
              setTimeout(() => { this.state = GameState.VICTORY; }, 1000);
            }
          }
          break;
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
      this.state = GameState.GAME_OVER;
    }
    // 检查胜利 (时间到了且 Boss 还没出，或者 Boss 已死)
    if (this.currentTime >= this.totalTime && !this.bossSpawned) {
      this.state = GameState.VICTORY; 
    }

    this.frameCount++;
    const input = this.joystick.getInputVector();
    this.hero.update(input);

    const newBullet = this.hero.tryAttack(this.enemies);
    if (newBullet) this.bullets.push(newBullet);

    this.spawnEnemy();
    
    // 敌人生成与更新（Boss 会返回子弹数组）
    this.enemies.forEach(e => {
      const bullets = e.update(this.hero);
      if (bullets && bullets.length > 0) {
        this.enemyBullets.push(...bullets);
      }
    });
    
    this.bullets.forEach(b => b.update());
    this.enemyBullets.forEach(eb => eb.update()); // 更新敌人子弹
    this.orbs.forEach(o => o.update(this.hero)); // 更新经验球
    this.floatingTexts.forEach(ft => ft.update()); // 更新浮动文字

    this.checkCollisions();

    // 清理
    this.enemies = this.enemies.filter(e => e.active);
    this.bullets = this.bullets.filter(b => b.active);
    this.enemyBullets = this.enemyBullets.filter(eb => eb.active);
    this.orbs = this.orbs.filter(o => o.active);
    this.floatingTexts = this.floatingTexts.filter(ft => ft.active);
  }

  render() {
    // 渲染游戏画面
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    this.orbs.forEach(o => o.render(this.ctx)); // 画球
    this.enemies.forEach(e => e.render(this.ctx));
    this.bullets.forEach(b => b.render(this.ctx));
    this.hero.render(this.ctx);
    this.floatingTexts.forEach(ft => ft.render(this.ctx)); // 渲染浮动文字
    this.joystick.render(this.ctx);
    
    // UI: 经验条
    this.renderHUD();

    // UI: 升级弹窗
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
    this.ctx.fillText('Tap to Restart', this.screenWidth / 2, this.screenHeight / 2 + 40);
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
    this.ctx.fillText('You Defeated the Boss!', this.screenWidth / 2, this.screenHeight / 2 + 40);
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
