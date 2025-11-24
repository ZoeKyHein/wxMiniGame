// --- START OF FILE js/core/debug_system.js ---
import { ItemRegistry } from '../data/items.js';
import Enemy from '../npc/enemy.js';

export default class DebugSystem {
  constructor(game) {
    this.game = game;
    this.active = false;
    
    // 按钮布局配置
    this.btnWidth = 140;
    this.btnHeight = 50;
    this.margin = 10;
    this.cols = 3; 

    // 定义所有的调试指令
    this.commands = [
      { label: '💰 加金币', action: () => this.addCoins() },
      { label: '📚 解锁全图鉴', action: () => this.unlockAll() },
      { label: '🗑️ 清除存档', action: () => this.clearSave() },
      { label: '⚔️ 直面 Boss', action: () => this.startBossTest() },
      { label: '🧟 尸潮测试', action: () => this.startHordeTest() },
      { label: '🎁 获得随机道具', action: () => this.getRandomItem() },
      { label: '🛡️ 无敌模式', action: () => this.toggleGodMode() },
      { label: '⚡ 升 5 级', action: () => this.levelUp(5) },
      { label: '💀 杀光敌人', action: () => this.killAll() },
      { label: '📺 模拟看广告', action: () => this.mockAd() }
    ];
  }

  // --- 作弊逻辑 ---

  addCoins() {
    this.game.totalCoins += 10000;
    wx.setStorageSync('totalCoins', this.game.totalCoins);
    wx.showToast({ title: '已到账 1W', icon: 'none' });
  }

  unlockAll() {
    const allIds = Object.keys(ItemRegistry);
    wx.setStorageSync('unlocked_items', allIds);
    wx.showToast({ title: '图鉴全开', icon: 'none' });
  }

  clearSave() {
    wx.clearStorageSync();
    this.game.totalCoins = 0;
    this.game.talentLevels = {};
    wx.showToast({ title: '存档已清空', icon: 'none' });
  }

  startBossTest() {
    this.game.restart(); // 先开始游戏
    
    // 等待一帧确保游戏已初始化
    setTimeout(() => {
      // 1. 清空所有敌人
      this.game.enemies = [];
      
      // 2. 设置 Boss 已生成标记，阻止继续刷小怪
      this.game.bossSpawned = true;
      
      // 3. 设置时间到 Boss 阶段
      this.game.currentTime = 900; // 15分钟，Boss 时间
      
      // 4. 直接生成 Boss
      this.game.spawnBoss();
      
      // 5. 给玩家一些属性
      this.game.level = 20; // 设置等级
      this.game.hero.hp = 1000;    // 给点血
      this.game.hero.maxHp = 1000;
      this.game.hero.projectileCount = 3; // 给点武器
      
      // 6. 给一些经验值，触发升级
      this.game.currentExp = 0;
      this.game.maxExp = 50;
      for (let i = 0; i < 20; i++) {
        this.game.maxExp = Math.floor(this.game.maxExp * 1.5);
      }
      
      this.active = false; // 关闭菜单
      console.log('Boss test started! Boss spawned:', this.game.bossSpawned);
    }, 100);
  }

  startHordeTest() {
    if (this.game.state !== 'playing') {
      this.game.restart();
      setTimeout(() => {
        this.spawnHorde();
      }, 100);
    } else {
      this.spawnHorde();
    }
    this.active = false;
  }

  spawnHorde() {
    this.game.enemies = [];
    // 生成 50 个冲锋怪
    for(let i = 0; i < 50; i++) {
      const e = new Enemy(this.game.worldWidth, this.game.worldHeight, 'charger', 1, this.game);
      e.x = this.game.hero.x + (Math.random() - 0.5) * 1000;
      e.y = this.game.hero.y + (Math.random() - 0.5) * 1000;
      // 确保不超出世界边界
      e.x = Math.max(0, Math.min(e.x, this.game.worldWidth));
      e.y = Math.max(0, Math.min(e.y, this.game.worldHeight));
      this.game.enemies.push(e);
    }
  }

  getRandomItem() {
    // 只能在游戏里用
    if (this.game.state !== 'playing') {
      wx.showToast({ title: '请先开始游戏', icon: 'none' });
      return;
    }
    // 强制触发一次升级三选一
    this.game.triggerLevelUp();
    this.active = false;
  }

  toggleGodMode() {
    if (this.game.hero) {
      this.game.hero.isInvincibleCheat = !this.game.hero.isInvincibleCheat;
      wx.showToast({ 
        title: this.game.hero.isInvincibleCheat ? '无敌开启' : '无敌关闭', 
        icon: 'none' 
      });
    } else {
      wx.showToast({ title: '请先开始游戏', icon: 'none' });
    }
    this.active = false;
  }

  levelUp(levels) {
    if (this.game.state !== 'playing') {
      wx.showToast({ title: '请先开始游戏', icon: 'none' });
      return;
    }
    this.game.currentExp += this.game.maxExp * levels;
    this.game.checkLevelUp();
    this.active = false;
  }

  killAll() {
    if (this.game.state !== 'playing') {
      wx.showToast({ title: '请先开始游戏', icon: 'none' });
      return;
    }
    this.game.enemies.forEach(e => e.hp = 0);
    wx.showToast({ title: '敌人已清除', icon: 'none' });
    this.active = false;
  }
  
  mockAd() {
    if (this.game.state !== 'game_over') {
      wx.showToast({ title: '仅在游戏结束时可用', icon: 'none' });
      return;
    }
    this.game.triggerRevive();
    this.active = false;
  }

  // --- UI 渲染与交互 ---

  render(ctx) {
    if (!this.active) return;

    // 半透明黑底
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, this.game.screenWidth, this.game.screenHeight);

    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🚧 DEBUG PANEL 🚧', this.game.screenWidth / 2, 50);

    // 绘制网格按钮
    const startX = 40;
    const startY = 100;

    this.commands.forEach((cmd, index) => {
      const col = index % this.cols;
      const row = Math.floor(index / this.cols);
      
      const x = startX + col * (this.btnWidth + this.margin);
      const y = startY + row * (this.btnHeight + this.margin);

      // 按钮背景
      ctx.fillStyle = '#34495e';
      ctx.fillRect(x, y, this.btnWidth, this.btnHeight);

      // 按钮边框
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, this.btnWidth, this.btnHeight);

      // 按钮文字
      ctx.fillStyle = '#ecf0f1';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cmd.label, x + this.btnWidth / 2, y + this.btnHeight / 2);
    });

    // 关闭按钮
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(this.game.screenWidth - 80, 20, 60, 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('X', this.game.screenWidth - 50, 40);
  }

  handleTouch(x, y) {
    if (!this.active) return false;

    // 检查关闭按钮
    if (x > this.game.screenWidth - 80 && x < this.game.screenWidth - 20 && y > 20 && y < 60) {
      this.active = false;
      return true; // 拦截事件
    }

    // 检查命令按钮
    const startX = 40;
    const startY = 100;

    this.commands.forEach((cmd, index) => {
      const col = index % this.cols;
      const row = Math.floor(index / this.cols);
      const bx = startX + col * (this.btnWidth + this.margin);
      const by = startY + row * (this.btnHeight + this.margin);

      if (x >= bx && x <= bx + this.btnWidth && y >= by && y <= by + this.btnHeight) {
        console.log(`Debug cmd: ${cmd.label}`);
        cmd.action();
        return true;
      }
    });

    return true; // 拦截所有点击，防止穿透到底层
  }
}

