/**
 * 虚拟摇杆管理器
 */
export default class Joystick {
  constructor(screenWidth, screenHeight) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    // 摇杆参数
    this.radius = 60;        // 底座半径
    this.knobRadius = 30;    // 摇杆头半径
    this.maxDist = 50;       // 摇杆头最大移动距离

    // 摇杆中心位置 (屏幕左下角)
    this.x = 100;
    this.y = this.screenHeight - 100;

    // 触摸状态
    this.touchId = null;     // 当前控制摇杆的触摸ID
    this.knobX = this.x;     // 摇杆头当前X
    this.knobY = this.y;     // 摇杆头当前Y
    this.angle = 0;          // 当前角度 (弧度)
    this.power = 0;          // 推力力度 (0~1)
  }

  /**
   * 处理触摸开始
   */
  onTouchStart(e) {
    // 如果已经有触摸在控制摇杆，忽略新的
    if (this.touchId !== null) return;

    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      // 简单判断：触摸点在屏幕左半边，且大致在下半部分，就认为是操作摇杆
      // 这里为了体验优化，设置判定区域为左半屏
      if (touch.clientX < this.screenWidth / 2) {
        this.touchId = touch.identifier;
        
        // 可选：摇杆中心跟随手指按下位置（动态摇杆），这里先用固定位置
        // this.x = touch.clientX;
        // this.y = touch.clientY; 
        
        this.updateKnobPosition(touch.clientX, touch.clientY);
        break;
      }
    }
  }

  /**
   * 处理触摸移动
   */
  onTouchMove(e) {
    if (this.touchId === null) return;

    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === this.touchId) {
        this.updateKnobPosition(touches[i].clientX, touches[i].clientY);
        break;
      }
    }
  }

  /**
   * 处理触摸结束
   */
  onTouchEnd(e) {
    if (this.touchId === null) return;

    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === this.touchId) {
        this.reset();
        break;
      }
    }
  }

  updateKnobPosition(touchX, touchY) {
    const dx = touchX - this.x;
    const dy = touchY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.angle = Math.atan2(dy, dx);
    
    // 限制摇杆头距离
    const dist = Math.min(distance, this.maxDist);
    this.power = dist / this.maxDist; // 计算力度

    this.knobX = this.x + Math.cos(this.angle) * dist;
    this.knobY = this.y + Math.sin(this.angle) * dist;
  }

  reset() {
    this.touchId = null;
    this.knobX = this.x;
    this.knobY = this.y;
    this.power = 0;
  }

  /**
   * 获取当前的输入向量 {x, y} (归一化)
   */
  getInputVector() {
    if (this.power === 0) return { x: 0, y: 0 };
    return {
      x: Math.cos(this.angle) * this.power,
      y: Math.sin(this.angle) * this.power
    };
  }

  render(ctx) {
    // 绘制底座
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // 绘制摇杆头
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(this.knobX, this.knobY, this.knobRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }
}