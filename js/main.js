import Joystick from './runtime/joystick'
import Hero from './player/hero'

/**
 * 游戏主控类
 */
export default class Main {
  constructor() {
    // 1. 初始化 Canvas
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');

    const { screenWidth, screenHeight, devicePixelRatio } = wx.getSystemInfoSync();
    this.canvas.width = screenWidth * devicePixelRatio;
    this.canvas.height = screenHeight * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);

    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    // 2. 初始化游戏对象
    this.joystick = new Joystick(screenWidth, screenHeight);
    this.hero = new Hero(screenWidth, screenHeight);

    this.isPlaying = true;

    // 3. 绑定触摸事件
    this.initTouchEvents();

    // 4. 开始循环
    this.bindLoop = this.loop.bind(this);
    this.restart();
  }

  initTouchEvents() {
    wx.onTouchStart((e) => this.joystick.onTouchStart(e));
    wx.onTouchMove((e) => this.joystick.onTouchMove(e));
    wx.onTouchEnd((e) => this.joystick.onTouchEnd(e));
  }

  restart() {
    console.log("游戏启动: 摇杆+角色移动");
    window.requestAnimationFrame(this.bindLoop, this.canvas);
  }

  update() {
    // 获取摇杆输入
    const input = this.joystick.getInputVector();
    // 更新角色
    this.hero.update(input);
  }

  render() {
    // 清屏 (深灰色地面)
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 绘制参考网格 (可选，方便看移动)
    this.drawGrid();

    // 渲染游戏对象
    this.hero.render(this.ctx);
    this.joystick.render(this.ctx);
  }

  drawGrid() {
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