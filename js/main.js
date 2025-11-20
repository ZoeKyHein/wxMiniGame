import Joystick from './runtime/joystick.js'
import Hero from './player/hero.js'
import Enemy from './npc/enemy.js'

export default class Main {
  constructor() {
    // ... (保留之前的 Canvas 初始化) ...
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');
    const { screenWidth, screenHeight, devicePixelRatio } = wx.getSystemInfoSync();
    this.canvas.width = screenWidth * devicePixelRatio;
    this.canvas.height = screenHeight * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    // 初始化组件
    this.joystick = new Joystick(screenWidth, screenHeight);
    this.hero = new Hero(screenWidth, screenHeight);
    
    // 实体列表
    this.enemies = [];
    this.bullets = [];
    
    // 游戏控制
    this.frameCount = 0;
    this.isPlaying = true;

    this.initTouchEvents();
    this.bindLoop = this.loop.bind(this);
    this.restart();
  }

  initTouchEvents() {
    wx.onTouchStart((e) => this.joystick.onTouchStart(e));
    wx.onTouchMove((e) => this.joystick.onTouchMove(e));
    wx.onTouchEnd((e) => this.joystick.onTouchEnd(e));
  }

  restart() {
    this.enemies = [];
    this.bullets = [];
    this.frameCount = 0;
    window.requestAnimationFrame(this.bindLoop, this.canvas);
  }

  /**
   * 生成敌人逻辑
   */
  spawnEnemy() {
    // 每 60 帧 (约1秒) 生成一个敌人
    if (this.frameCount % 60 === 0) {
      const enemy = new Enemy(this.screenWidth, this.screenHeight);
      this.enemies.push(enemy);
    }
  }

  /**
   * 碰撞检测逻辑 (AABB 简单矩形碰撞)
   */
  checkCollisions() {
    // 子弹打敌人
    for (let bullet of this.bullets) {
      if (!bullet.active) continue;
      
      for (let enemy of this.enemies) {
        if (!enemy.active) continue;

        // 简单的距离检测 (半径和)
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 假设判定半径是 20
        if (dist < 20) {
          bullet.active = false;
          enemy.hp--;
          // 可以在这里加飘字效果
          break; // 一颗子弹只打一个怪
        }
      }
    }

    // 敌人碰主角 (这里先不做主角掉血，只打印)
    for (let enemy of this.enemies) {
        if (!enemy.active) continue;
        const dx = enemy.x - this.hero.x;
        const dy = enemy.y - this.hero.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 30) {
            // console.log("主角受到伤害！");
        }
    }
  }

  update() {
    this.frameCount++;

    // 1. 更新主角
    const input = this.joystick.getInputVector();
    this.hero.update(input);

    // 2. 主角尝试射击
    const newBullet = this.hero.tryAttack(this.enemies);
    if (newBullet) {
      this.bullets.push(newBullet);
    }

    // 3. 更新敌人
    this.spawnEnemy();
    this.enemies.forEach(enemy => enemy.update(this.hero));

    // 4. 更新子弹
    this.bullets.forEach(bullet => bullet.update());

    // 5. 碰撞检测
    this.checkCollisions();

    // 6. 清理死亡对象 (简单的 filter，性能以后优化)
    this.enemies = this.enemies.filter(e => e.active);
    this.bullets = this.bullets.filter(b => b.active);
  }

  render() {
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 绘制参考网格
    this.drawGrid();

    // 绘制实体
    this.enemies.forEach(e => e.render(this.ctx));
    this.bullets.forEach(b => b.render(this.ctx));
    this.hero.render(this.ctx);
    this.joystick.render(this.ctx);
    
    // UI：敌人数量
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Enemies: ${this.enemies.length}`, 10, 30);
  }

  drawGrid() {
     // ... (保持不变) ...
     this.ctx.strokeStyle = '#444';
     this.ctx.lineWidth = 1;
     const gridSize = 50;
     for (let x = 0; x < this.screenWidth; x += gridSize) {
       this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.screenHeight); this.ctx.stroke();
     }
     for (let y = 0; y < this.screenHeight; y += gridSize) {
       this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.screenWidth, y); this.ctx.stroke();
     }
  }

  loop() {
    if (this.isPlaying) {
      this.update();
      this.render();
      window.requestAnimationFrame(this.bindLoop, this.canvas);
    }
  }
}