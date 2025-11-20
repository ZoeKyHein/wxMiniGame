// 头部引入
import ElementalSystem from './core/elemental.js';
import Hero from './player/hero.js';
import Enemy from './npc/enemy.js';
import Joystick from './runtime/joystick.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './render.js';

export default class Main {
  constructor() {
    // 获取 canvas 和 context
    this.canvas = GameGlobal.canvas;
    this.ctx = this.canvas.getContext('2d');
    
    // 初始化游戏对象
    this.hero = new Hero(SCREEN_WIDTH, SCREEN_HEIGHT);
    this.enemies = [];
    this.bullets = [];
    this.joystick = new Joystick(SCREEN_WIDTH, SCREEN_HEIGHT);
    
    // 游戏状态
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = 60; // 每60帧生成一个敌人
    
    // 绑定触摸事件
    this.bindTouchEvents();
    
    // 开始游戏循环
    this.gameLoop();
  }
  
  bindTouchEvents() {
    wx.onTouchStart((e) => {
      this.joystick.onTouchStart(e);
    });
    
    wx.onTouchMove((e) => {
      this.joystick.onTouchMove(e);
    });
    
    wx.onTouchEnd((e) => {
      this.joystick.onTouchEnd(e);
    });
  }
  
  update() {
    // 更新摇杆输入
    const inputVector = this.joystick.getInputVector();
    
    // 更新主角
    this.hero.update(inputVector);
    
    // 主角攻击
    const newBullet = this.hero.tryAttack(this.enemies);
    if (newBullet) {
      this.bullets.push(newBullet);
    }
    
    // 更新子弹
    for (let bullet of this.bullets) {
      bullet.update();
    }
    // 清理无效子弹
    this.bullets = this.bullets.filter(b => b.active);
    
    // 生成敌人
    this.enemySpawnTimer++;
    if (this.enemySpawnTimer >= this.enemySpawnInterval) {
      this.enemySpawnTimer = 0;
      this.enemies.push(new Enemy(SCREEN_WIDTH, SCREEN_HEIGHT));
    }
    
    // 更新敌人
    for (let enemy of this.enemies) {
      enemy.update(this.hero);
    }
    // 清理无效敌人
    this.enemies = this.enemies.filter(e => e.active);
    
    // 检测碰撞
    this.checkCollisions();
  }
  
  render() {
    // 清空画布
    this.ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    
    // 绘制背景
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    
    // 绘制敌人
    for (let enemy of this.enemies) {
      enemy.render(this.ctx);
    }
    
    // 绘制子弹
    for (let bullet of this.bullets) {
      bullet.render(this.ctx);
    }
    
    // 绘制主角
    this.hero.render(this.ctx);
    
    // 绘制摇杆
    this.joystick.render(this.ctx);
  }
  
  checkCollisions() {
    // 子弹打敌人
    for (let bullet of this.bullets) {
      if (!bullet.active) continue;
      
      for (let enemy of this.enemies) {
        if (!enemy.active) continue;

        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 20) {
          bullet.active = false;
          
          // --- 核心修改：调用元素系统计算伤害 ---
          const baseDamage = 1; 
          const result = ElementalSystem.calculate(
            enemy.attachedElement, // 敌人当前的
            bullet.elementType,    // 子弹带来的
            baseDamage
          );
          
          // 扣血
          enemy.hp -= result.damage;
          
          // 更新敌人身上的元素状态
          enemy.attachedElement = result.remainingElement;
          
          // TODO: 如果 result.reaction === 'vaporize'，可以在这里播放一个特效
          // -----------------------------------
          
          break;
        }
      }
    }
    
    // 敌人碰主角
    for (let enemy of this.enemies) {
      if (!enemy.active) continue;
      
      const dx = enemy.x - this.hero.x;
      const dy = enemy.y - this.hero.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 30) {
        // 游戏结束或扣血逻辑
        // TODO: 实现游戏结束逻辑
      }
    }
  }
  
  gameLoop() {
    this.update();
    this.render();
    const raf = wx.requestAnimationFrame || requestAnimationFrame;
    raf(() => this.gameLoop());
  }
}
