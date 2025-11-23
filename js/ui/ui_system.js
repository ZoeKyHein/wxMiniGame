// --- START OF FILE js/ui/ui_system.js ---

export default class UISystem {
  constructor(screenWidth, screenHeight) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.isPaused = false;
    
    // 预警圈列表
    this.warningZones = [];
  }

  // --- 暂停功能 ---
  togglePause() {
    this.isPaused = !this.isPaused;
  }

  renderPauseMenu(ctx) {
    if (!this.isPaused) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 菜单框
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(this.screenWidth/2 - 100, this.screenHeight/2 - 80, 200, 160);
    
    ctx.fillStyle = '#fff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', this.screenWidth/2, this.screenHeight/2 - 30);
    
    ctx.font = '20px Arial';
    ctx.fillText('Tap to Resume', this.screenWidth/2, this.screenHeight/2 + 20);
    ctx.restore();
  }

  // --- 屏幕外箭头 ---
  // targets: 关键目标列表 (Boss, 宝箱)
  // camera: 当前摄像机
  renderOffScreenIndicators(ctx, camera, targets) {
    const padding = 30; // 距离屏幕边缘的距离
    const cx = this.screenWidth / 2;
    const cy = this.screenHeight / 2;

    targets.forEach(target => {
      if (!target.active) return;

      // 目标在屏幕上的坐标
      const screenX = target.x - camera.x;
      const screenY = target.y - camera.y;

      // 判断是否在屏幕内
      if (screenX >= 0 && screenX <= this.screenWidth &&
          screenY >= 0 && screenY <= this.screenHeight) {
        return; // 在屏幕内，不需要箭头
      }

      // 计算角度
      const dx = screenX - cx;
      const dy = screenY - cy;
      const angle = Math.atan2(dy, dx);

      // 计算箭头在屏幕边缘的位置
      // 简单的算法：把向量长度限制在屏幕半径内
      // 更精确的算法是求射线与矩形的交点，这里用简单的 Clamp 模拟
      let arrowX = cx + Math.cos(angle) * (this.screenWidth/2 - padding);
      let arrowY = cy + Math.sin(angle) * (this.screenHeight/2 - padding);
      
      // 修正：确保在矩形框上
      // (这里为了代码简单，用椭圆轨迹代替矩形边缘，视觉上也可以接受)
      
      // 绘制箭头
      ctx.save();
      ctx.translate(arrowX, arrowY);
      ctx.rotate(angle);
      
      ctx.fillStyle = target.type === 'boss' ? '#e74c3c' : '#f1c40f'; // Boss红，宝箱黄
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-10, 10);
      ctx.lineTo(-10, -10);
      ctx.fill();
      
      ctx.restore();
    });
  }

  // --- 伤害预警 ---
  addWarningZone(x, y, radius, duration, callback) {
    this.warningZones.push({
      x, y, radius, 
      maxDuration: duration, 
      timer: duration, 
      callback
    });
  }

  updateWarnings() {
    if (this.isPaused) return;

    for (let i = this.warningZones.length - 1; i >= 0; i--) {
      const w = this.warningZones[i];
      w.timer--;
      if (w.timer <= 0) {
        if (w.callback) w.callback(); // 触发爆炸或攻击
        this.warningZones.splice(i, 1);
      }
    }
  }

  renderWarnings(ctx, camera) {
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    this.warningZones.forEach(w => {
      const progress = 1 - (w.timer / w.maxDuration);
      
      // 绘制底色 (半透明红)
      ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制倒计时缩圈 (越来越小或者越来越实)
      ctx.strokeStyle = `rgba(231, 76, 60, ${0.5 + progress * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius * progress, 0, Math.PI * 2); // 从中心扩散，或者 w.radius * (1-progress) 收缩
      ctx.stroke();
    });

    ctx.restore();
  }
}

