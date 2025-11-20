import Joystick from './runtime/joystick.js';
import Hero from './player/hero.js';
import Enemy from './npc/enemy.js';
import Bullet from './weapon/bullet.js';
import ExpOrb from './item/exp_orb.js';
import FloatingText from './ui/floating_text.js';
import ElementalSystem from './core/elemental.js';
import { ElementType, ReactionType } from './base/constants.js';

// 游戏状态枚举
const GameState = {
  PLAYING: 'playing',
  LEVEL_UP: 'level_up',
  GAME_OVER: 'game_over'
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

    this.initTouchEvents();
    this.bindLoop = this.loop.bind(this);
    this.restart();
  }

  initTouchEvents() {
    wx.onTouchStart((e) => {
      if (this.state === GameState.PLAYING) {
        this.joystick.onTouchStart(e);
      } else if (this.state === GameState.LEVEL_UP) {
        this.handleLevelUpTouch(e);
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
    this.orbs = [];
    this.floatingTexts = [];
    this.frameCount = 0;
    this.state = GameState.PLAYING;
    this.level = 1;
    this.currentExp = 0;
    this.maxExp = 50;
    
    const raf = wx.requestAnimationFrame || requestAnimationFrame;
    raf(this.bindLoop, this.canvas);
  }

  spawnEnemy() {
    if (this.frameCount % 60 === 0) {
      const enemy = new Enemy(this.screenWidth, this.screenHeight);
      this.enemies.push(enemy);
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
        if (dist < 20) {
          bullet.active = false;
          const baseDamage = 1; // 基础伤害
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
            // --- 掉落经验球 ---
            this.orbs.push(new ExpOrb(enemy.x, enemy.y, 20));
          }
          break;
        }
      }
    }

    // 2. 玩家吃经验球
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
    
    // 3. 敌人撞玩家 (略)
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
          // 掉落经验球
          this.orbs.push(new ExpOrb(enemy.x, enemy.y, 20));
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

    this.frameCount++;
    const input = this.joystick.getInputVector();
    this.hero.update(input);

    const newBullet = this.hero.tryAttack(this.enemies);
    if (newBullet) this.bullets.push(newBullet);

    this.spawnEnemy();
    
    this.enemies.forEach(e => e.update(this.hero));
    this.bullets.forEach(b => b.update());
    this.orbs.forEach(o => o.update(this.hero)); // 更新经验球
    this.floatingTexts.forEach(ft => ft.update()); // 更新浮动文字

    this.checkCollisions();

    // 清理
    this.enemies = this.enemies.filter(e => e.active);
    this.bullets = this.bullets.filter(b => b.active);
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
  }

  renderHUD() {
    // 经验条背景
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.screenWidth, 10);
    // 经验条进度
    this.ctx.fillStyle = '#2ecc71';
    const pct = Math.min(1, this.currentExp / this.maxExp);
    this.ctx.fillRect(0, 0, this.screenWidth * pct, 10);
    
    // 等级文字
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`LV. ${this.level}`, this.screenWidth - 10, 35);
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

  loop() {
    // 即使暂停也要 requestAnimationFrame 才能维持画面渲染（虽然 update 停了）
    this.update();
    this.render();
    const raf = wx.requestAnimationFrame || requestAnimationFrame;
    raf(this.bindLoop, this.canvas);
  }
}
