import Joystick from './runtime/joystick.js';
import Hero from './player/hero.js';
import Enemy from './npc/enemy.js';
import Bullet from './weapon/bullet.js';
import EnemyBullet from './weapon/enemy_bullet.js';
import ExpOrb from './item/exp_orb.js';
import FloatingText from './ui/floating_text.js';
import Particle from './runtime/particle.js'; // 新增引入
import ElementalSystem from './core/elemental.js';
import { ElementType, ReactionType, PickupType } from './base/constants.js';
import { Characters } from './base/characters.js';
import ResourceLoader from './base/resource.js'; // 引入资源加载器
import { pool } from './base/pool.js'; // 引入对象池
import { audio } from './base/audio.js'; // 引入音频管理器

// 游戏状态枚举
const GameState = {
  START: 'start',
  CHAR_SELECT: 'char_select',
  SHOP: 'shop', // 新增商店状态
  PLAYING: 'playing',
  LEVEL_UP: 'level_up',
  GAME_OVER: 'game_over',
  VICTORY: 'victory'
};

// 天赋配置
const Talents = [
  { id: 'might', name: '力量', desc: '基础伤害 +10%', cost: 100, maxLv: 5 },
  { id: 'vitality', name: '活力', desc: '生命上限 +20', cost: 100, maxLv: 5 },
  { id: 'greed', name: '贪婪', desc: '金币获取 +20%', cost: 150, maxLv: 3 }
];

export default class Main {
  constructor() {
    // Canvas 初始化
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');
    
    // 1. 获取系统信息
    const info = wx.getSystemInfoSync();
    const { screenWidth, screenHeight, devicePixelRatio } = info;
    
    this.canvas.width = screenWidth * devicePixelRatio;
    this.canvas.height = screenHeight * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    
    // 2. 计算安全区域 (Safe Area)
    // info.safeArea 包含了 { left, top, right, bottom, width, height }
    // 对于横屏游戏，我们主要关注 left (避开左边刘海) 和 right
    this.safeArea = info.safeArea || { 
      left: 0, 
      top: 0, 
      width: this.screenWidth, 
      height: this.screenHeight 
    };
    
    // 如果是横屏，screenWidth 通常等于 windowWidth
    // 我们可以定义一个全局 padding
    this.uiPadding = Math.max(20, this.safeArea.left);

    // 2. 加载资源
    this.loader = new ResourceLoader();
    this.images = null; // 初始化图片对象
    this.loader.load((images) => {
      this.images = images; // 保存加载好的图片
      this.initGame();      // 资源加载完毕，启动游戏
    });
  }
  
  // 新增：初始化游戏逻辑 (把原本 constructor 剩下的代码移到这里)
  initGame() {
    // 默认角色
    this.selectedCharKey = 'ranger';
    this.killCount = 0;
    
    // 读取存档
    this.totalCoins = wx.getStorageSync('totalCoins') || 0;
    this.talentLevels = wx.getStorageSync('talentLevels') || {}; // { might: 0, vitality: 1 ... }

    // 实体
    this.joystick = null;
    
    // 实体列表（在 restart 里初始化）
    this.particles = []; // 新增粒子列表

    // 记录最高分 (本地存储)
    this.bestTime = wx.getStorageSync('bestTime') || 0;
    
    // 新增：震动参数
    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    this.state = GameState.START; // 默认进入标题页
    
    // 复活标记
    this.hasRevived = false;
    this.gameOverSoundPlayed = false;
    this.victorySoundPlayed = false;

    this.initTouchEvents();
    this.bindLoop = this.loop.bind(this);
    
    // 不再自动调用 restart，而是等待点击
    const raf = wx.requestAnimationFrame || requestAnimationFrame;
    raf(this.bindLoop, this.canvas);
    
    // 游戏开始，播放 BGM
    audio.playBgm();
    
    // 初始化微信功能（分享、排行榜等）
    this.initWeChatFeatures();
  }
  
  initWeChatFeatures() {
    // 1. 开启分享菜单 (右上角三个点)
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });

    // 2. 监听被动分享 (用户点击右上角转发)
    wx.onShareAppMessage(() => {
      return {
        title: '这是我玩过最爽的肉鸽游戏！你能坚持15分钟吗？',
        imageUrl: 'images/hero.png' // 或者专门做一张 5:4 的宣传图
      };
    });
  }
  
  shareResult() {
    const mins = Math.floor(this.currentTime / 60);
    wx.shareAppMessage({
      title: `我在《元素生存》里坚持了 ${mins} 分钟！太难了！`,
      imageUrl: 'images/hero.png' // 截屏或宣传图
    });
  }
  
  saveScoreToCloud() {
    // 游戏结束，打破记录时上传到云端
    const scoreStr = this.currentTime.toString();
    wx.setUserCloudStorage({
      KVDataList: [{ key: 'survival_time', value: scoreStr }],
      success: res => console.log('分数上传成功'),
      fail: err => console.log('分数上传失败', err)
    });
  }

  initTouchEvents() {
    wx.onTouchStart((e) => {
      const tx = e.changedTouches[0].clientX;
      const ty = e.changedTouches[0].clientY;
      
      if (this.state === GameState.START) {
        // 检查是否点击了商店按钮
        const btnX = this.screenWidth / 2 - 80;
        const btnY = this.screenHeight / 2 + 100;
        if (tx >= btnX && tx <= btnX + 160 && ty >= btnY && ty <= btnY + 50) {
          this.state = GameState.SHOP;
          return;
        }
        // 否则进选人
        this.state = GameState.CHAR_SELECT;
      } else if (this.state === GameState.SHOP) {
        this.handleShopTouch(tx, ty);
      } else if (this.state === GameState.CHAR_SELECT) {
        this.handleCharSelect(e);
      } else if (this.state === GameState.PLAYING) {
        this.joystick.onTouchStart(e);
      } else if (this.state === GameState.LEVEL_UP) {
        this.handleLevelUpTouch(e);
      } else if (this.state === GameState.GAME_OVER) {
        const btnX = this.screenWidth / 2 - 80;
        // 检查是否点击了复活按钮
        if (!this.hasRevived) {
          const reviveBtnY = this.screenHeight / 2 + 20;
          if (tx >= btnX && tx <= btnX + 160 && ty >= reviveBtnY && ty <= reviveBtnY + 50) {
            this.triggerRevive();
            return;
          }
        }
        // 检查是否点击了分享按钮
        const shareBtnY = this.screenHeight / 2 + 100;
        if (tx >= btnX && tx <= btnX + 160 && ty >= shareBtnY && ty <= shareBtnY + 50) {
          this.shareResult();
          return;
        }
        // 否则重开
        this.state = GameState.START;
      } else if (this.state === GameState.VICTORY) {
        this.state = GameState.START; // 游戏结束点击回标题
      }
    });
    
    wx.onTouchMove((e) => {
      if (this.state === GameState.PLAYING) {
        this.joystick.onTouchMove(e);
      }
    });
    
    wx.onTouchEnd((e) => {
      if (this.state === GameState.PLAYING && this.joystick) {
        this.joystick.onTouchEnd(e);
      }
    });
  }

  handleCharSelect(e) {
    const touchX = e.changedTouches[0].clientX;
    const width = this.screenWidth;
    if (touchX < width / 3) {
      this.selectCharacter('mage');
    } else if (touchX < (width * 2) / 3) {
      this.selectCharacter('berserker');
    } else {
      this.selectCharacter('ranger');
    }
  }

  selectCharacter(charKey) {
    this.selectedCharKey = charKey;
    this.restart();
  }

  handleShopTouch(tx, ty) {
    // 返回按钮
    if (ty > this.screenHeight - 60) {
      this.state = GameState.START;
      return;
    }
    
    // 点击购买逻辑
    Talents.forEach((t, i) => {
      const y = 100 + i * 80;
      if (ty >= y && ty < y + 60) {
        // 检查是否点击了购买按钮区域
        const btnX = this.screenWidth - 120;
        if (tx >= btnX && tx <= btnX + 100) {
          this.buyTalent(t);
        }
      }
    });
  }

  buyTalent(talent) {
    const currentLv = this.talentLevels[talent.id] || 0;
    if (currentLv >= talent.maxLv) return; // 满级
    
    const cost = talent.cost * (currentLv + 1); // 价格随等级递增
    if (this.totalCoins >= cost) {
      this.totalCoins -= cost;
      this.talentLevels[talent.id] = currentLv + 1;
      
      // 保存
      wx.setStorageSync('totalCoins', this.totalCoins);
      wx.setStorageSync('talentLevels', this.talentLevels);
      
      console.log('Bought', talent.name, 'Lv.', currentLv + 1);
    }
  }

  restart() {
    const config = Characters[this.selectedCharKey] || Characters.ranger;
    this.hero = new Hero(this.screenWidth, this.screenHeight, config);
    this.joystick = new Joystick(this.screenWidth, this.screenHeight);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.orbs = [];
    this.floatingTexts = [];
    this.particles = [];
    
    // --- 应用天赋 ---
    const lvMight = this.talentLevels['might'] || 0;
    const lvVitality = this.talentLevels['vitality'] || 0;
    const lvGreed = this.talentLevels['greed'] || 0;
    
    // 1. 活力：直接加血上限
    if (lvVitality > 0) {
      const hpAdd = 20 * lvVitality;
      this.hero.maxHp += hpAdd;
      this.hero.hp += hpAdd;
    }
    
    // 2. 力量：伤害倍率
    this.hero.damageMultiplier = 1 + (0.1 * lvMight);
    
    // 3. 贪婪：金币倍率
    this.coinMultiplier = 1 + (0.2 * lvGreed); // 清空粒子

    this.frameCount = 0;
    this.state = GameState.PLAYING;
    this.level = 1;
    this.currentExp = 0;
    this.maxExp = 50;
    this.upgradeOptions = [];

    // 恢复 15 分钟时长
    this.totalTime = 15 * 60; // 900 秒
    this.currentTime = 0;
    this.lastTime = Date.now();
    this.bossSpawned = false;
    this.killCount = 0;
    
    // 重置震动
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    
    // 重置复活标记
    this.hasRevived = false;
    this.gameOverSoundPlayed = false;
    this.victorySoundPlayed = false;
    
    // 确保重启时 BGM 也在播
    audio.playBgm();
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
  
  // 枪口闪光 (射击时调用)
  spawnMuzzleFlash(x, y, angle) {
    // 生成 3-5 个快速消失的小火花
    for(let i = 0; i < 5; i++) {
      const speed = Math.random() * 2 + 2;
      // 沿着射击方向扇形散开
      const spread = (Math.random() - 0.5) * 0.5; 
      const particleAngle = angle + spread;
      
      // 使用对象池获取粒子
      const p = pool.getItemByClass('particle', Particle, x, y, '#ffffff', {
        size: Math.random() * 3 + 2,
        life: 5 + Math.random() * 5, // 存活时间很短
        speed: speed,
        angle: particleAngle,
        friction: 0.8,
        shape: 'circle'
      });
      this.particles.push(p);
    }
  }
  
  // 优化爆炸效果 (根据颜色生成不同样式的粒子)
  spawnExplosion(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      // 使用对象池获取粒子
      const p = pool.getItemByClass('particle', Particle, x, y, color, {
        size: Math.random() * 4 + 2,
        life: 20 + Math.random() * 10,
        speed: Math.random() * 4 + 1,
        friction: 0.9,
        shape: Math.random() > 0.5 ? 'circle' : 'rect'
      });
      this.particles.push(p);
    }
  }
  
  saveScore() {
    if (this.currentTime > this.bestTime) {
      this.bestTime = this.currentTime;
      wx.setStorageSync('bestTime', this.bestTime);
      // 打破记录时上传到云端排行榜
      this.saveScoreToCloud();
    }
    // 保存金币
    wx.setStorageSync('totalCoins', this.totalCoins);
  }

  spawnEnemy() {
    if (this.bossSpawned) return;
    
    // 完整的 15 分钟波次配置
    // interval: 多少帧刷一只 (60帧=1秒)
    // limit: 场上最大怪物数 (防止手机卡顿)
    const waves = [
      // [0 - 3分钟] 发育期：只有普通怪，刷得慢
      { time: 0,   end: 180, interval: 60, types: ['normal'], limit: 20 },
      
      // [3 - 5分钟] 升温期：加入冲锋怪，刷怪稍快
      { time: 180, end: 300, interval: 50, types: ['normal', 'charger'], limit: 30 },
      
      // [5 - 10分钟] 中期激战：混合刷怪，频率加快
      { time: 300, end: 600, interval: 30, types: ['normal', 'charger'], limit: 50 },
      
      // [10 - 14分钟] 后期高压：主要刷普通怪，但频率极高 (割草爽局)
      { time: 600, end: 840, interval: 20, types: ['normal', 'charger'], limit: 80 },
      
      // [14 - 15分钟] 暴走潮：疯狂刷怪，迎接 Boss
      { time: 840, end: 900, interval: 10, types: ['normal', 'charger'], limit: 120 },
      
      // [15分钟+] Boss 阶段
      { time: 900, end: 9999, interval: 999, types: ['boss'], limit: 1 } 
    ];
    
    // 找到当前对应的波次
    const currentWave = waves.find(w => this.currentTime >= w.time && this.currentTime < w.end);
    
    if (currentWave) {
      // 1. 检查数量限制
      if (this.enemies.length < currentWave.limit) {
        // 2. 生成怪物
        if (this.frameCount % currentWave.interval === 0) {
          const type = currentWave.types[Math.floor(Math.random() * currentWave.types.length)];
          
          // 如果是 Boss 时间 (15分钟)，且 Boss 还没出
          if (type === 'boss') {
            if (!this.bossSpawned) {
              this.spawnBoss();
            }
          } else {
            // 普通生成，根据游戏时间动态调整血量（数值平衡）
            // 第 1 分钟：基础血量，第 5 分钟：血量 x2，第 10 分钟：血量 x3
            const hpMultiplier = 1 + Math.floor(this.currentTime / 60) * 0.2; // 每分钟增加 20%
            this.enemies.push(new Enemy(this.screenWidth, this.screenHeight, type, hpMultiplier));
          }
        }
      }
    }
    
    // 每 5 分钟 (300秒) 刷一只精英怪
    // 为了防止和 Boss 同时出，加上 !bossSpawned 判断
    // this.currentTime > 0 防止开局就刷
    if (this.currentTime > 0 && this.currentTime % 300 === 0 && this.frameCount % 60 === 0 && !this.bossSpawned) {
      this.spawnElite();
    }
  }
  
  // 辅助：生成 Boss
  spawnBoss() {
    this.bossSpawned = true;
    this.enemies = []; // 清空小怪，单挑
    this.floatingTexts.push(new FloatingText(
      this.screenWidth / 2, 
      150, 
      "BOSS WARNING!", 
      '#f1c40f',
      35
    ));
    // Boss 血量固定，不受时间影响（已经是最终挑战）
    this.enemies.push(new Enemy(this.screenWidth, this.screenHeight, 'boss', 1));
    this.triggerShake(60, 10); // 剧烈震动
    
    // 播放 Boss 音乐逻辑可以在这里加
  }
  
  // 辅助：生成精英
  spawnElite() {
    this.floatingTexts.push(new FloatingText(
      this.screenWidth / 2, 
      100, 
      "ELITE APPEARED!", 
      '#8e44ad',
      30
    ));
    // 精英怪也根据时间调整血量
    const hpMultiplier = 1 + Math.floor(this.currentTime / 60) * 0.2;
    this.enemies.push(new Enemy(this.screenWidth, this.screenHeight, 'elite', hpMultiplier));
    this.triggerShake(20, 5);
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
    
    // 播放升级音效
    audio.play('levelup');
    
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
      if (this.hero.trait !== 'prismatic') {
        this.hero.currentElement = option.type; // 切换当前武器
      }
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
      if (this.hero.trait === 'blood_pact') {
        this.floatingTexts.push(new FloatingText(this.hero.x, this.hero.y - 20, 'Heal Blocked', '#e74c3c', 20));
      } else {
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + this.hero.maxHp * 0.3);
      }
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
          
          // 优化：击中特效
          // 1. 普通击中：黄色火花
          this.spawnExplosion(bullet.x, bullet.y, '#ffffaa', 5);
          
          // 1. 伤害计算
          let damage = 2; // 基础伤害
          
          // 应用力量天赋
          if (this.hero.damageMultiplier) {
            damage *= this.hero.damageMultiplier;
          }
          
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

          if (this.hero.trait === 'prismatic' && result.reaction !== ReactionType.NONE) {
            result.damage *= 1.5;
            if (result.aoeDamage) {
              result.aoeDamage *= 1.5;
            }
          }
          
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
          enemy.hitFlashTimer = 5; // 受击白闪 5 帧
          enemy.attachedElement = result.remainingElement;

          // 基础击退（Boss 免疫）
          if (result.knockback > 0 && enemy.type !== 'boss') {
            const kx = enemy.x - bullet.x;
            const ky = enemy.y - bullet.y;
            const kdist = Math.sqrt(kx * kx + ky * ky) || 1;
            enemy.x += (kx / kdist) * result.knockback;
            enemy.y += (ky / kdist) * result.knockback;
            enemy.x = Math.max(0, Math.min(this.screenWidth, enemy.x));
            enemy.y = Math.max(0, Math.min(this.screenHeight, enemy.y));
          }
          
          // 2. 暴击/元素反应：大爆炸
          if (bullet.isCrit || result.reaction !== ReactionType.NONE) {
            // 根据元素类型决定爆炸颜色
            let color = '#ffffff';
            if (bullet.elementType === ElementType.FIRE) color = '#ff4d4d';
            else if (bullet.elementType === ElementType.LIGHTNING) color = '#cc66ff';
            else if (bullet.elementType === ElementType.WATER) color = '#4da6ff';
            else if (bullet.elementType === ElementType.ICE) color = '#80dfff';
            
            // 产生向四周飞溅的圆环粒子 (用大量小粒子模拟)
            this.spawnExplosion(bullet.x, bullet.y, color, 10);
            // 播放爆炸音效（只有大爆炸或暴击时才播放，防止太吵）
            audio.play('explosion');
          }
          
          // 飘字（优化：减少飘字数量，避免满屏数字）
          // 只有当暴击、反应、或者随机几率满足时才飘字
          let showText = bullet.isCrit || result.reaction !== ReactionType.NONE || Math.random() < 0.3;
          
          if (showText) {
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
                bullet.isCrit ? '#ff0000' : '#ffffff',
                textType === 'crit' ? 28 : 24
              ));
            }
          }
          
          // AOE 效果（反应或基础火焰）
          if (result.aoeRange > 0) {
            let range = result.aoeRange + this.hero.passives.blast_radius;
            let aoeDamage = result.aoeDamage || result.damage * 0.5;
            if (result.reaction === ReactionType.NONE && bullet.elementType === ElementType.FIRE) {
              // 火焰基础溅射，伤害较低
              aoeDamage = result.damage * 0.5;
              this.spawnExplosion(enemy.x, enemy.y, '#e74c3c', 8);
              this.triggerShake(5, 2);
            } else {
              this.spawnExplosion(enemy.x, enemy.y, '#9b59b6', 15);
              this.triggerShake(5, 2);
            }
            this.handleOverloadAoE(enemy.x, enemy.y, range, aoeDamage);
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
        const isHit = this.hero.takeDamage(eb.damage);
        if (isHit) {
          this.floatingTexts.push(new FloatingText(
            this.hero.x, 
            this.hero.y, 
            `-${eb.damage}`, 
            '#e74c3c',
            20
          ));
          // 玩家受伤粒子
          this.spawnExplosion(this.hero.x, this.hero.y, '#ff0000', 5);
          this.triggerShake(15, 5); // 中震动
        }
      }
    }

    // 3. 玩家吃经验球/金币
    for (let orb of this.orbs) {
      if (!orb.active) continue;
      const dist = Math.sqrt((orb.x - this.hero.x)**2 + (orb.y - this.hero.y)**2);
      // 吸收范围
      if (dist < 30) {
        orb.active = false;
        if (orb.type === PickupType.EXP) {
          this.currentExp += orb.value;
          this.checkLevelUp();
        } else if (orb.type === PickupType.COIN) {
          // 应用贪婪天赋
          const amount = Math.floor(orb.value * (this.coinMultiplier || 1));
          this.totalCoins += amount;
          // 显示金币获得提示
          this.floatingTexts.push(new FloatingText(orb.x, orb.y, `+$${amount}`, '#f1c40f', 20));
        } else if (orb.type === PickupType.HEALTH) {
          // 回血逻辑（狂战士不能回血）
          if (this.hero.trait !== 'blood_pact') {
            this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + orb.value);
          }
        }
      }
    }
    
    // 4. 敌人撞玩家
    for (let enemy of this.enemies) {
      if (!enemy.active) continue;
      
      const dist = Math.sqrt((enemy.x - this.hero.x)**2 + (enemy.y - this.hero.y)**2);
      // 简单的圆形碰撞 (假设主角半径20, 敌人半径 width/2)
      if (dist < (20 + enemy.width / 2)) {
        const isHit = this.hero.takeDamage(enemy.damage);
        if (isHit) {
          const shakePower = (enemy.type === 'boss' || enemy.type === 'elite') ? 10 : 5;
          this.triggerShake(15, shakePower); // 根据敌人类型调整震动
          this.floatingTexts.push(new FloatingText(
            this.hero.x,
            this.hero.y,
            `-${enemy.damage}`,
            '#e74c3c',
            20
          ));
          this.spawnExplosion(this.hero.x, this.hero.y, '#ff0000', 5);
        }
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
    this.orbs.push(new ExpOrb(enemy.x, enemy.y, PickupType.EXP, expValue));
    
    // 几率掉金币 (普通怪 5%，精英怪 50%，Boss 100% 掉大量)
    let dropCoin = false;
    let coinValue = 10;
    
    const rand = Math.random();
    if (enemy.type === 'boss') {
      dropCoin = true;
      coinValue = 500;
    } else if (enemy.type === 'elite') {
      if (rand < 0.5) {
        dropCoin = true;
        coinValue = 50;
      }
    } else {
      if (rand < 0.05) {
        dropCoin = true;
        coinValue = 10;
      }
    }
    
    if (dropCoin) {
      // 给个小偏移，别叠在经验球上
      this.orbs.push(new ExpOrb(enemy.x + 10, enemy.y, PickupType.COIN, coinValue));
    }
    
    // --- 特质：狂战士 ---
    if (this.hero.trait === 'blood_pact') {
      this.killCount = (this.killCount || 0) + 1;
      if (this.killCount % 10 === 0) {
        this.hero.maxHp += 1;
        this.hero.hp += 1; // 同时也回1点血
        // 飘个字提示一下
        this.floatingTexts.push(new FloatingText(this.hero.x, this.hero.y, "MaxHP UP!", '#ff0000', 24));
      }
    }
    
    // 如果 Boss 死了，直接胜利 (延迟一点)
    if (enemy.type === 'boss') {
      this.saveScore(); // 胜利保存
      // 保存金币
      wx.setStorageSync('totalCoins', this.totalCoins);
      setTimeout(() => { this.state = GameState.VICTORY; }, 1000);
    }

    if (this.hero.trait === 'blood_pact') {
      this.killCount = (this.killCount || 0) + 1;
      if (this.killCount % 10 === 0) {
        this.hero.maxHp += 1;
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + 1);
        this.floatingTexts.push(new FloatingText(
          this.hero.x,
          this.hero.y - 20,
          'Max HP +1',
          '#c0392b',
          20
        ));
      }
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
      this.saveScore(); // 死亡保存（包含金币）
      this.state = GameState.GAME_OVER;
    }
    // 检查胜利 (时间到了且 Boss 还没出，或者 Boss 已死)
    if (this.currentTime >= this.totalTime && !this.bossSpawned) {
      this.saveScore(); // 包含金币保存
      this.state = GameState.VICTORY; 
    }

    this.frameCount++;
    const input = this.joystick ? this.joystick.getInputVector() : { x: 0, y: 0 };
    this.hero.update(input);

    // 玩家射击 (改为接收数组)
    const newBullets = this.hero.tryAttack(this.enemies);
    if (newBullets && newBullets.length > 0) {
      this.bullets.push(...newBullets); // 展开数组推入
      
      // 播放射击音效
      audio.play('shoot');
      
      // 新增：枪口闪光
      // 计算射击角度 (取第一颗子弹的方向)
      const b = newBullets[0];
      const angle = Math.atan2(b.velocityY, b.velocityX);
      // 在主角位置产生火花
      this.spawnMuzzleFlash(this.hero.x + Math.cos(angle) * 20, this.hero.y + Math.sin(angle) * 20, angle);
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
          this.orbs.push(new ExpOrb(e.x, e.y, PickupType.EXP, exp));
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

    // --- 优化后的清理逻辑（使用对象池） ---
    
    // 1. 子弹清理（回收对象池）
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (!this.bullets[i].active) {
        pool.recover('bullet', this.bullets[i]); // 回收
        this.bullets.splice(i, 1); // 移除
      }
    }
    
    // 2. 粒子清理（回收对象池）
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].life <= 0) {
        pool.recover('particle', this.particles[i]); // 回收
        this.particles.splice(i, 1); // 移除
      }
    }
    
    // 3. 其他对象清理（暂时保持原样，因为数量较少）
    this.enemies = this.enemies.filter(e => e.active);
    this.enemyBullets = this.enemyBullets.filter(eb => eb.active);
    this.orbs = this.orbs.filter(o => o.active);
    this.floatingTexts = this.floatingTexts.filter(ft => ft.active);
  }

  render() {
    // 1. 计算震动偏移
    let offsetX = 0;
    let offsetY = 0;
    if (this.shakeTimer > 0) {
      this.shakeTimer--;
      offsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      offsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
    }
    
    // 2. 保存画布状态并应用偏移
    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);
    
    // 绘制背景图
    if (this.images && this.images['bg']) {
      // 简单拉伸填满屏幕
      this.ctx.drawImage(this.images['bg'], 0, 0, this.screenWidth, this.screenHeight);
    } else {
      // 没图时的备选方案
      this.ctx.fillStyle = '#333333';
      this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    }

    // 如果是 START 界面
    if (this.state === GameState.START) {
      this.renderStartScreen();
      this.ctx.restore(); // 记得 restore
      return;
    }
    if (this.state === GameState.CHAR_SELECT) {
      this.renderCharSelect();
      this.ctx.restore();
      return;
    }
    if (this.state === GameState.SHOP) {
      this.renderShop();
      this.ctx.restore();
      return;
    }

    // 游戏内渲染 - Y-Sorting（根据 y 坐标排序，实现正确的遮挡关系）
    // 1. 收集所有需要参与 Y-Sort 的实体
    const renderList = [];
    
    // 添加主角
    renderList.push({ entity: this.hero, type: 'hero' });
    
    // 添加敌人
    this.enemies.forEach(e => {
      renderList.push({ entity: e, type: 'enemy' });
    });
    
    // 添加掉落物
    this.orbs.forEach(o => {
      renderList.push({ entity: o, type: 'orb' });
    });
    
    // 2. 根据 y 坐标排序（y 越小越靠前画）
    renderList.sort((a, b) => a.entity.y - b.entity.y);
    
    // 3. 遍历绘制
    renderList.forEach(item => {
      if (item.type === 'hero') {
        item.entity.render(this.ctx, this.images ? this.images['hero'] : null);
      } else if (item.type === 'enemy') {
        let imgKey = 'enemy_normal';
        if (item.entity.type === 'charger') imgKey = 'enemy_charger';
        else if (item.entity.type === 'elite') imgKey = 'enemy_elite';
        else if (item.entity.type === 'boss') imgKey = 'enemy_boss';
        item.entity.render(this.ctx, this.images ? this.images[imgKey] : null);
      } else if (item.type === 'orb') {
        item.entity.render(this.ctx, this.images ? this.images['exp_orb'] : null);
      }
    });
    
    // 4. 子弹和特效通常在最上层，不需要参与 Y-Sort
    this.bullets.forEach(b => b.render(this.ctx, this.images ? this.images['bullet'] : null));
    this.enemyBullets.forEach(eb => eb.render(this.ctx, this.images ? this.images['bullet'] : null));
    
    // 粒子渲染
    this.particles.forEach(p => p.render(this.ctx));
    
    this.floatingTexts.forEach(ft => ft.render(this.ctx));
    if (this.joystick) {
      this.joystick.render(this.ctx);
    }
    
    // --- 新增：低血量红屏警示 ---
    if (this.state === GameState.PLAYING && this.hero) {
      const hpRatio = this.hero.hp / this.hero.maxHp;
      if (hpRatio < 0.3) {
        // 计算透明度：血越少越红，且带有呼吸效果 (sin)
        const pulse = (Math.sin(Date.now() / 200) + 1) / 2; // 0~1 循环
        const alpha = (0.3 - hpRatio) * 3 * (0.5 + 0.5 * pulse); // 基础浓度 + 呼吸
        
        // 绘制全屏红色渐变 (四周红，中间透)
        const grad = this.ctx.createRadialGradient(
          this.screenWidth / 2, this.screenHeight / 2, this.screenHeight / 4,
          this.screenWidth / 2, this.screenHeight / 2, this.screenHeight
        );
        grad.addColorStop(0, 'rgba(255, 0, 0, 0)');
        grad.addColorStop(1, `rgba(255, 0, 0, ${Math.min(0.6, alpha)})`);
        
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
      }
    }
    // ----------------------------
    
    this.renderHUD();

    if (this.state === GameState.LEVEL_UP) {
      this.renderLevelUpUI();
    }
    if (this.state === GameState.GAME_OVER) {
      if (!this.gameOverSoundPlayed) {
        audio.stopBgm();
        audio.play('lose');
        this.gameOverSoundPlayed = true;
      }
      this.renderGameOverUI();
    }
    if (this.state === GameState.VICTORY) {
      if (!this.victorySoundPlayed) {
        audio.stopBgm();
        audio.play('win');
        this.victorySoundPlayed = true;
      }
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
    this.ctx.fillText('Tap to choose a hero', this.screenWidth / 2, this.screenHeight / 2 + 90);
    
    // 绘制"商店"按钮
    this.ctx.fillStyle = '#e67e22';
    this.ctx.fillRect(this.screenWidth / 2 - 80, this.screenHeight / 2 + 100, 160, 50);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.fillText(`SHOP ($${this.totalCoins})`, this.screenWidth / 2, this.screenHeight / 2 + 132);
  }
  
  renderShop() {
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    
    this.ctx.fillStyle = '#f1c40f';
    this.ctx.font = '30px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`TALENT SHOP ($${this.totalCoins})`, this.screenWidth / 2, 50);
    
    Talents.forEach((t, i) => {
      const lv = this.talentLevels[t.id] || 0;
      const y = 100 + i * 80;
      const cost = t.cost * (lv + 1);
      
      // 背景
      this.ctx.fillStyle = '#34495e';
      this.ctx.fillRect(20, y, this.screenWidth - 40, 60);
      
      // 文字
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '20px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`${t.name} (Lv.${lv}/${t.maxLv})`, 40, y + 35);
      
      this.ctx.font = '14px Arial';
      this.ctx.fillStyle = '#bdc3c7';
      this.ctx.fillText(t.desc, 180, y + 35);
      
      // 价格按钮
      if (lv < t.maxLv) {
        this.ctx.fillStyle = (this.totalCoins >= cost) ? '#27ae60' : '#7f8c8d';
        this.ctx.fillRect(this.screenWidth - 120, y + 10, 100, 40);
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`$${cost}`, this.screenWidth - 70, y + 35);
      } else {
        this.ctx.fillStyle = '#e67e22';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("MAX", this.screenWidth - 70, y + 35);
      }
    });
    
    // 返回按钮
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.fillRect(this.screenWidth / 2 - 60, this.screenHeight - 50, 120, 40);
    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText("BACK", this.screenWidth / 2, this.screenHeight - 25);
  }

  renderCharSelect() {
    this.ctx.fillStyle = '#19232f';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    this.ctx.fillStyle = '#f1c40f';
    this.ctx.font = 'bold 32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SELECT YOUR HERO', this.screenWidth / 2, 60);

    const keys = ['mage', 'berserker', 'ranger'];
    const cardWidth = this.screenWidth / 3;
    keys.forEach((key, index) => {
      const char = Characters[key];
      const x = index * cardWidth;

      this.ctx.fillStyle = '#243447';
      this.ctx.fillRect(x + 10, 100, cardWidth - 20, this.screenHeight - 140);

      this.ctx.fillStyle = char.color;
      this.ctx.font = 'bold 24px Arial';
      this.ctx.fillText(char.name, x + cardWidth / 2, 150);

      this.ctx.fillStyle = '#ecf0f1';
      this.ctx.font = '16px Arial';
      const lines = char.desc.split('\n');
      lines.forEach((line, i) => {
        this.ctx.fillText(line, x + cardWidth / 2, 200 + i * 24);
      });
    });
  }

  renderHUD() {
    // 1. 经验条 (顶部，使用安全区域 padding)
    const expBarY = 10;
    const expBarHeight = 10;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(this.uiPadding, expBarY, this.screenWidth - this.uiPadding * 2, expBarHeight);
    this.ctx.fillStyle = '#2ecc71';
    const expPct = Math.min(1, this.currentExp / this.maxExp);
    this.ctx.fillRect(this.uiPadding, expBarY, (this.screenWidth - this.uiPadding * 2) * expPct, expBarHeight);
    
    // 2. 倒计时 (顶部居中，确保 y 不太靠上)
    const remaining = this.totalTime - this.currentTime;
    const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
    const secs = (remaining % 60).toString().padStart(2, '0');
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${mins}:${secs}`, this.screenWidth / 2, 45); // 从 35 改为 45，避开刘海
    
    // 3. 等级文字 (右上角，使用安全区域)
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`LV. ${this.level}`, this.screenWidth - this.uiPadding, 45);
    
    // 4. 血条 (底部中间，使用安全区域)
    const hpBarWidth = 200;
    const hpBarHeight = 20;
    const hpX = (this.screenWidth - hpBarWidth) / 2;
    const hpY = this.screenHeight - 40 - (this.screenHeight - this.safeArea.bottom); // 避开底部安全区域
    
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
    
    // 绘制 "Revive" 按钮 (如果还没复活过)
    if (!this.hasRevived) {
      this.ctx.fillStyle = '#2ecc71';
      this.ctx.fillRect(this.screenWidth / 2 - 80, this.screenHeight / 2 + 20, 160, 50);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 20px Arial';
      this.ctx.fillText('Revive (Ad)', this.screenWidth / 2, this.screenHeight / 2 + 52);
    }
    
    // 绘制 "分享战绩" 按钮
    const shareBtnY = this.screenHeight / 2 + 100;
    this.ctx.fillStyle = '#3498db';
    this.ctx.fillRect(this.screenWidth / 2 - 80, shareBtnY, 160, 50);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.fillText('分享战绩', this.screenWidth / 2, shareBtnY + 32);
    
    // 绘制 "Restart" 按钮
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px Arial';
    this.ctx.fillText('Tap elsewhere to Restart', this.screenWidth / 2, shareBtnY + 80);
  }
  
  triggerRevive() {
    console.log('Watching Ad for Revive...');
    // 这里对接微信广告 API: wx.createRewardedVideoAd
    // 模拟成功：
    this.hasRevived = true;
    this.state = GameState.PLAYING;
    this.hero.isDead = false;
    this.hero.hp = this.hero.maxHp; // 满血复活
    this.hero.invincibleTime = 120; // 给2秒无敌防止起身就死
    this.enemies = []; // 清场，给玩家喘息机会
    this.bullets = [];
    this.enemyBullets = [];
    
    audio.playBgm(); // 恢复音乐
    this.triggerShake(30, 5); // 复活震动
    this.spawnExplosion(this.hero.x, this.hero.y, '#2ecc71', 20); // 复活特效
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
