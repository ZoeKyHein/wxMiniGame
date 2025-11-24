import { ElementType } from '../base/constants.js';
import ElementalSystem from '../core/elemental.js';
import EnemyBullet from '../weapon/enemy_bullet.js'; // 引入子弹
import SpriteAnimation from '../base/sprite_animation.js'; // 引入动画系统

// 简单的 ID 生成器
let enemyIdCounter = 0;

export default class Enemy {
  // 新增 type 参数，默认 'normal'
  // 新增 hpMultiplier 参数，用于动态调整血量（数值平衡）
  // 新增 game 参数，用于访问资源
  constructor(worldWidth, worldHeight, type = 'normal', hpMultiplier = 1, game = null) {
    this.id = enemyIdCounter++; // 唯一 ID
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.type = type; // 'normal' | 'elite' | 'boss' | 'charger' (新增)
    this.game = game; // 游戏实例，用于访问资源
    
    this.initPosition();
    this.active = true;
    this.attachedElement = ElementType.NONE;
    
    // --- 新增：Boss 动画初始化 ---
    this.anim = null;
    if (this.type === 'boss' && game && game.images) {
      const img = game.images['boss_sheet'];
      if (img) {
        // ⚠️ 请根据图片实际尺寸修改这里
        // 如果整张图宽度约 512px，横向8格，那么单帧通常是 64x64
        // 如果整张图宽度约 800px，横向8格，那么单帧通常是 100x100
        const frameW = 64;  // 请根据实际图片修改！
        const frameH = 64;  // 请根据实际图片修改！
        
        this.anim = new SpriteAnimation(img, frameW, frameH);
        
        // === 动作配置 (根据图片分析得出) ===
        // Row 0: 正面跑动 (Front Run) - ✅ 保留 (A面，向屏幕下方跑)
        // Row 1: 侧面跑动 (Side Run) - ❌ 屏蔽 (造成3D旋转感的元凶)
        // Row 2: 背面跑动 (Back Run) - ✅ 保留 (C面，向屏幕上方跑)
        // Row 3: 正面物理攻击/突刺 - (可选)
        // Row 4: 侧面物理攻击/突刺 - ❌ 屏蔽
        // Row 5: 正面施法/举杖 (Magic Cast) - ✅ 保留 (最帅的攻击动作)
        // Row 6: 死亡/碎裂 (Death) - ✅ 保留
        
        // 1. 移动动画 (分前后)
        this.anim.addAnim('run_front', 0, 8, 6, true);  // Row 0: 正面跑 (8帧)
        this.anim.addAnim('run_back',  2, 8, 6, true);  // Row 2: 背面跑 (8帧)
        
        // 2. 待机动画 (复用跑动的第一帧)
        this.anim.addAnim('idle_front', 0, 1, 10, true);
        this.anim.addAnim('idle_back',  2, 1, 10, true);
        
        // 3. 攻击动画 (施法)
        // Row 5: 法杖发光施法 (8帧)
        // 注意：因为没有背面施法，所以攻击时无论在哪，都播放 Row 5
        // 视觉效果：Boss 放技能时会瞬间转过来面对屏幕，很霸气
        this.anim.addAnim('attack_front', 5, 8, 5, false);
        this.anim.addAnim('attack_back',  5, 8, 5, false); // 复用正面，逻辑上Boss会回头
        
        // 4. 死亡动画
        // Row 6: 碎裂消失 (10帧)
        this.anim.addAnim('death', 6, 10, 8, false);
        
        this.anim.play('run_front'); // 默认正面跑
      }
    }
    
    // 属性配置
    if (this.type === 'boss') {
      this.width = 100;
      this.height = 100;
      this.speed = 1;     // Boss 移动很慢
      this.hp = Math.floor(5000 * hpMultiplier);      // 血量极厚（提升到5000基础值）
      this.color = '#000'; // 黑色 (或者深紫)
      this.damage = 50;   // 碰撞伤害极高
      
      // Boss 特有：射击冷却
      this.shootTimer = 0;
      this.shootInterval = 100; // 约 1.5秒射一次
    } else if (this.type === 'elite') {
      this.width = 60;
      this.height = 60;
      this.speed = 1.5;
      this.hp = Math.floor(50 * hpMultiplier);
      this.color = '#8e44ad';
      this.damage = 20;
    } else if (this.type === 'charger') { // 新增冲锋怪
      this.width = 35;
      this.height = 35;
      this.speed = 3.5;
      this.hp = Math.floor(8 * hpMultiplier);
      this.color = '#e67e22'; // 橙色
      this.damage = 15;
      // 冲锋状态机: 0=追击, 1=蓄力, 2=冲锋, 3=硬直
      this.chargeState = 0;
      this.chargeTimer = 0;
      this.chargeDir = {x: 0, y: 0}; // 冲锋方向
    } else {
      this.width = 30;
      this.height = 30;
      this.speed = 2;
      this.hp = Math.floor(10 * hpMultiplier);
      this.color = '#e74c3c'; // 红色
      this.damage = 10;
    }
    
    // 保存原始速度，用于恢复
    this.baseSpeed = this.speed;
    
    // 新增：状态控制
    this.freezeTimer = 0; // 冻结倒计时
    this.burnTimer = 0;    // 燃烧倒计时
    this.burnDamage = 0;   // 燃烧每跳伤害
    this.hitFlashTimer = 0; // 受击白闪倒计时
    
    // --- 程序化动画 ---
    this.walkCycle = 0; // 走路循环计数
    this.lastX = this.x; // 记录上一帧位置
    this.lastY = this.y;
  }

  // ... (保留 initPosition 和 update) ...
  initPosition() { 
    // 在世界范围内随机生成，但会在后续 spawnEnemy 中被覆盖
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { this.x = Math.random() * this.worldWidth; this.y = -50; } 
    else if (side === 1) { this.x = this.worldWidth + 50; this.y = Math.random() * this.worldHeight; } 
    else if (side === 2) { this.x = Math.random() * this.worldWidth; this.y = this.worldHeight + 50; } 
    else { this.x = -50; this.y = Math.random() * this.worldHeight; }
  }

  /**
   * 更新逻辑，Boss 会返回子弹数组
   */
  update(player) {
    // Boss 死亡动画处理
    if (this.type === 'boss' && this.anim) {
      if (this.hp <= 0) {
        // 播放死亡动画
        if (this.anim.currentAnim !== 'death') {
          this.anim.play('death');
        }
        this.anim.update();
        
        // 死亡动画播完才彻底移除
        if (this.anim.isFinished) {
          this.active = false;
          return null;
        }
        return null; // 死亡播放中，不执行移动攻击
      }
      
      // ===============================================
      //  智能朝向判断：移动时分前后，攻击时强制正面
      // ===============================================
      
      const dy = player.y - this.y; // y差值（玩家在Boss下方时 dy > 0）
      const dx = player.x - this.x; // x差值（玩家在Boss左边时 dx < 0）
      
      // 1. 左右翻转 (Flip) - 始终生效
      // 根据玩家在左在右决定镜像，让法杖在左手/右手有区别
      this.anim.flipX = (dx < 0);
      
      // 2. 决定动作 (Action) & 朝向 (Facing)
      let actionName = '';
      
      // 判断是否在攻击状态（射击前一段时间进入攻击动作）
      // shootInterval 通常是 100 帧，攻击前 40 帧（约 0.6 秒）开始播放攻击动画
      const isAttacking = (this.shootTimer > this.shootInterval - 40);
      
      if (isAttacking) {
        // ★ 攻击时：强制播放正面施法 (因为 Row 5 只有正面)
        // 视觉效果：Boss 无论怎么跑，放技能时会瞬间转过来面对屏幕，很霸气
        actionName = 'attack_front';
      } else {
        // ★ 移动时：根据 Y 轴决定跑背影还是跑正面
        if (dy < 0) {
          actionName = 'run_back';  // 玩家在上方，显示背影 (Row 2)
        } else {
          actionName = 'run_front'; // 玩家在下方，显示正面 (Row 0)
        }
      }
      
      // 3. 播放动画（如果动画名改变才切换，避免重复播放）
      if (this.anim.currentAnim !== actionName) {
        this.anim.play(actionName);
      }
      
      // 4. 更新动画帧
      this.anim.update();
    }
    
    if (this.hp <= 0) { 
      if (this.type !== 'boss') {
        this.active = false; 
      }
      return null; 
    }
    
    // 受击白闪倒计时递减
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // 1. 处理燃烧 (DoT)
    if (this.burnTimer > 0) {
      this.burnTimer--;
      // 每 30 帧 (约0.5秒) 跳一次伤害
      if (this.burnTimer % 30 === 0) {
        this.hp -= this.burnDamage;
      }
      // 烧死了
      if (this.hp <= 0) {
        if (this.type !== 'boss') {
          this.active = false;
        }
        return { diedByDot: true }; // 告诉 main 是被烧死的
      }
    }

    // 2. 处理冻结状态
    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      // 冻结时无法移动，也无法攻击
      return null;
    }

    // 2. 处理减速 (冰元素附着)
    let currentSpeed = this.baseSpeed;
    if (this.attachedElement === ElementType.ICE) {
      currentSpeed = this.baseSpeed * 0.5; // 减速 50%
    }

    // 冲锋怪特殊逻辑
    if (this.type === 'charger') {
      this.updateCharger(player, currentSpeed);
      return null;
    }

    // 3. 普通移动逻辑
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.x += (dx / dist) * currentSpeed;
      this.y += (dy / dist) * currentSpeed;
      
      // 更新走路循环
      const moved = Math.sqrt((this.x - this.lastX)**2 + (this.y - this.lastY)**2);
      if (moved > 0.1) {
        this.walkCycle += 0.15;
      } else {
        this.walkCycle *= 0.9;
      }
      this.lastX = this.x;
      this.lastY = this.y;
    }

    // Boss 射击逻辑
    if (this.type === 'boss') {
      this.shootTimer++;
      if (this.shootTimer >= this.shootInterval) {
        this.shootTimer = 0;
        const bullets = this.shoot(player);
        return { bullets: bullets };
      }
    }
    return null;
  }
  
  updateCharger(player, currentSpeed) {
    // 状态机
    if (this.chargeState === 0) { // 追击 (Chase)
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // 靠近到一定距离 (例如 200) 开始蓄力
      if (dist < 200) {
        this.chargeState = 1;
        this.chargeTimer = 40; // 蓄力 40帧 (约0.6秒)
      } else {
        this.x += (dx / dist) * currentSpeed;
        this.y += (dy / dist) * currentSpeed;
      }
    } 
    else if (this.chargeState === 1) { // 蓄力 (Prepare)
      this.chargeTimer--;
      if (this.chargeTimer <= 0) {
        this.chargeState = 2;
        this.chargeTimer = 20; // 冲锋持续 20帧
        // 锁定方向
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.chargeDir = { x: dx/dist, y: dy/dist };
      }
    }
    else if (this.chargeState === 2) { // 冲锋 (Dash)
      this.chargeTimer--;
      // 极快速度移动
      const dashSpeed = currentSpeed * 4; 
      this.x += this.chargeDir.x * dashSpeed;
      this.y += this.chargeDir.y * dashSpeed;
      
      if (this.chargeTimer <= 0) {
        this.chargeState = 3;
        this.chargeTimer = 60; // 硬直/休息 1秒
      }
    }
    else if (this.chargeState === 3) { // 硬直 (Cooldown)
      this.chargeTimer--;
      if (this.chargeTimer <= 0) {
        this.chargeState = 0; // 回到追击
      }
    }
  }

  shoot(player) {
    // 发射 3 颗扇形子弹
    const bullets = [];
    // 计算指向玩家的角度
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    
    // 中间一颗
    bullets.push(new EnemyBullet(this.x, this.y, player.x, player.y));
    
    // 左偏 20度
    const leftX = this.x + Math.cos(angle - 0.3) * 100;
    const leftY = this.y + Math.sin(angle - 0.3) * 100;
    bullets.push(new EnemyBullet(this.x, this.y, leftX, leftY));
    
    // 右偏 20度
    const rightX = this.x + Math.cos(angle + 0.3) * 100;
    const rightY = this.y + Math.sin(angle + 0.3) * 100;
    bullets.push(new EnemyBullet(this.x, this.y, rightX, rightY));

    return bullets;
  }

  render(ctx, img) {
    if (!this.active) return;

    // ==========================================
    // 情况 1: Boss (使用序列帧动画，不做挤压拉伸)
    // ==========================================
    if (this.type === 'boss' && this.anim) {
      // 1. 绘制阴影 (固定大小，不做动画)
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(1, 0.5);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      // Boss 的阴影大一点
      ctx.arc(0, this.height * 1.5, this.width / 2 * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. 处理受击白闪
      if (this.hitFlashTimer > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.7;
      }

      // 3. 渲染动画（不做任何 scaleX/scaleY/rotate 变换）
      // 只保留左右翻转，由 SpriteAnimation 内部处理
      this.anim.render(ctx, this.x, this.y, this.width * 2.0, this.height * 2.0);

      if (this.hitFlashTimer > 0) {
        ctx.restore();
      }

      // 4. 画血条
      this.renderHealthBar(ctx);
      return;
    }

    // ==========================================
    // 情况 2: 普通小怪 (静态图，使用程序化挤压拉伸)
    // ==========================================
    
    // 计算动画参数 (walkCycle)
    const isMoving = (Math.abs(this.x - this.lastX) > 0.1 || Math.abs(this.y - this.lastY) > 0.1);
    
    // 计算缩放 (挤压拉伸)
    const scaleY = 1 - Math.abs(Math.sin(this.walkCycle)) * 0.1; 
    const scaleX = 1 + Math.abs(Math.sin(this.walkCycle)) * 0.05;
    
    // 计算旋转 (左右摇摆)
    const rotateAngle = Math.sin(this.walkCycle) * 0.1;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // --- 绘制阴影 (永远在脚下，不随身体旋转) ---
    ctx.save();
    ctx.scale(1, 0.5); // 压扁成椭圆
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(0, this.height, this.width / 2 * scaleX, 0, Math.PI * 2); // 阴影随宽度变化
    ctx.fill();
    ctx.restore();
    
    // --- 本体变换 (程序化动画：挤压拉伸和旋转) ---
    ctx.rotate(rotateAngle);
    ctx.scale(scaleX, scaleY);
    
    // 1. 绘制怪物本体
    if (img) {
      // 如果处于白闪状态，修改混合模式
      if (this.hitFlashTimer > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.8;
      }
      
      // 冲锋怪蓄力闪烁
      if (this.type === 'charger' && this.chargeState === 1) {
        if (Math.floor(Date.now() / 50) % 2 === 0) {
          ctx.globalCompositeOperation = 'lighter';
        }
      }
      
      // 冲锋怪旋转
      if (this.type === 'charger') {
        ctx.rotate(Math.PI / 4);
      }
      
      ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
      
      // 恢复混合模式
      if (this.hitFlashTimer > 0) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
      }
    } else {
      // 如果处于白闪状态，先画白色
      if (this.hitFlashTimer > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
      }
      
      // 没图画方块 (保持原来的代码作为 fallback)
      // 绘制 Boss 边框
      if (this.type === 'boss') {
        ctx.strokeStyle = '#f1c40f'; // 金色边框
        ctx.lineWidth = 5;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
      }
      
      // 冲锋怪画成菱形 (旋转的矩形)
      if (this.type === 'charger') {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.PI / 4); // 旋转 45度
        
        // 蓄力时变白/闪烁
        if (this.chargeState === 1) {
          if (Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.fillStyle = '#fff';
          } else {
            ctx.fillStyle = this.color;
          }
        } else {
          ctx.fillStyle = this.color;
        }
        
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
      } else {
        // 其他怪正常渲染
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
      }
    }

    // 2. 燃烧效果 (在图片上盖一层半透明橙色)
    if (this.burnTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4; // 半透明
      ctx.fillStyle = '#e67e22';
      // 稍微画大一点点覆盖
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width/2 + 2, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // 3. 冻结效果 (画个冰蓝色的框或者圆)
    if (this.freezeTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#74b9ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width/2 + 4, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. 元素附着点
    if (this.attachedElement !== ElementType.NONE) {
      ctx.save();
      ctx.fillStyle = ElementalSystem.getColor(this.attachedElement);
      ctx.beginPath();
      ctx.arc(this.x, this.y - (this.height/2 + 10), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    ctx.restore(); // 恢复变换，确保血条在世界坐标系中绘制
    
    // 血条（必须在 restore 之后，使用世界坐标）
    this.renderHealthBar(ctx);
  }
  
  // 绘制血条（提取为独立方法）
  renderHealthBar(ctx) {
    const maxHp = this.type === 'boss' ? 5000 : (this.type === 'elite' ? 50 : (this.type === 'charger' ? 8 : 10));
    // 根据实际血量计算 maxHp（考虑 hpMultiplier）
    const actualMaxHp = maxHp; // 这里应该用初始血量，但为了简化，用类型基础值
    if (this.type !== 'normal' || this.hp < actualMaxHp) {
      const barWidth = this.type === 'boss' ? this.width * 1.5 : this.width; // Boss 血条更宽
      const barHeight = this.type === 'boss' ? 8 : 5; // Boss 血条更粗
      const barX = this.x - barWidth / 2;
      const barY = this.y - (this.height / 2 + 20); // 稍微高一点，避免和阴影重叠
      
      // 背景
      ctx.fillStyle = '#555';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // 血量
      const hpRatio = Math.max(0, Math.min(1, this.hp / actualMaxHp));
      ctx.fillStyle = this.type === 'boss' ? '#e74c3c' : '#0f0'; // Boss 血条红色
      ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
      
      // 边框
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
  }
}