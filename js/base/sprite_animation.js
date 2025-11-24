/**
 * 精灵动画控制器
 */
export default class SpriteAnimation {
  constructor(img, frameWidth, frameHeight) {
    this.img = img;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;

    // 动画配置表
    // key: 动作名, value: { row: 行号(从0开始), count: 帧数, speed: 切换速度(越小越快), loop: 是否循环 }
    this.anims = {};
    
    this.currentAnim = null; // 当前动作名
    this.currentFrame = 0;   // 当前第几帧
    this.timer = 0;          // 计时器
    this.isFinished = false; // 是否播放完毕（针对不循环的动作）
    
    // 翻转
    this.flipX = false;
  }

  /**
   * 定义动作
   */
  addAnim(name, row, count, speed = 5, loop = true) {
    this.anims[name] = { row, count, speed, loop };
  }

  /**
   * 播放动作
   * @param {string} name 动作名
   * @param {boolean} force 是否强制重新播放
   */
  play(name, force = false) {
    if (this.currentAnim === name && !force) return;

    this.currentAnim = name;
    this.currentFrame = 0;
    this.timer = 0;
    this.isFinished = false;
  }

  update() {
    if (!this.currentAnim) return;
    const config = this.anims[this.currentAnim];
    if (!config) return;

    // 如果播放完了且不循环，就停在最后一帧
    if (this.isFinished) return;

    this.timer++;
    if (this.timer >= config.speed) {
      this.timer = 0;
      this.currentFrame++;

      if (this.currentFrame >= config.count) {
        if (config.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = config.count - 1;
          this.isFinished = true;
          // 这里可以触发一个回调，比如 onComplete
        }
      }
    }
  }

  render(ctx, x, y, width, height) {
    if (!this.currentAnim || !this.img) return;
    
    const config = this.anims[this.currentAnim];
    if (!config) return;
    
    // 计算在原图上的剪切位置
    // 假设每一行是一个动作，列是帧
    const sx = this.currentFrame * this.frameWidth;
    const sy = config.row * this.frameHeight;

    ctx.save();
    // 移动到绘制中心
    ctx.translate(x, y);

    // 处理左右翻转
    if (this.flipX) {
      ctx.scale(-1, 1);
    }

    // 绘制剪切图
    // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    ctx.drawImage(
      this.img,
      sx, sy, this.frameWidth, this.frameHeight, // 剪切源图
      -width / 2, -height / 2, width, height     // 画在画布上 (居中)
    );

    ctx.restore();
  }
}

