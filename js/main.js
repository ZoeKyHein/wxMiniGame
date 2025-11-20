/**
 * 游戏主控类
 * 负责管理游戏循环、全局状态
 */
export default class Main {
  constructor() {
    // 1. 获取 Canvas 上下文
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');

    // 2. 适配屏幕宽高
    const { screenWidth, screenHeight, devicePixelRatio } = wx.getSystemInfoSync();
    // 显式设置宽高，防止模糊
    this.canvas.width = screenWidth * devicePixelRatio;
    this.canvas.height = screenHeight * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);

    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    // 3. 游戏状态
    this.isPlaying = true;

    // 4. 开始循环
    this.bindLoop = this.loop.bind(this);
    this.restart();
  }

  restart() {
    // 这里后续会初始化玩家、敌人管理器等
    console.log("游戏启动: 横屏模式", this.screenWidth, "x", this.screenHeight);
    
    window.requestAnimationFrame(this.bindLoop, this.canvas);
  }

  /**
   * 每一帧的逻辑更新
   */
  update() {
    // 比如：player.update()
    // enemyManager.update()
  }

  /**
   * 每一帧的画面渲染
   */
  render() {
    // 清空屏幕 (黑色背景)
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 测试绘制：画一个中心文字
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Elemental Survivor - Dev Build', this.screenWidth / 2, this.screenHeight / 2);
  }

  /**
   * 游戏主循环
   */
  loop() {
    if (this.isPlaying) {
      this.update();
      this.render();
      window.requestAnimationFrame(this.bindLoop, this.canvas);
    }
  }
}