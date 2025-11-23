export default class AudioManager {
  constructor() {
    this.sources = {
      // BGM
      bgm: 'audio/bgm.mp3',
      
      // 战斗 - 射击（不同元素）
      shoot_normal: 'audio/shoot_normal.mp3',
      shoot_fire: 'audio/shoot_fire.mp3',
      shoot_ice: 'audio/shoot_ice.mp3',
      shoot_lightning: 'audio/shoot_lightning.mp3',
      shoot_water: 'audio/shoot_normal.mp3', // 暂时复用普通音效
      
      // 战斗 - 击中与爆炸
      hit: 'audio/hit_flesh.mp3',
      hit_metal: 'audio/hit_metal.mp3',
      explosion: 'audio/explosion.mp3',
      explosion_small: 'audio/explosion_small.mp3',
      explosion_large: 'audio/explosion_large.mp3',
      
      // 元素反应
      reaction_freeze: 'audio/reaction_freeze.mp3',
      reaction_vaporize: 'audio/reaction_vaporize.mp3',
      
      // 拾取与成长
      coin: 'audio/pickup_coin.mp3',
      exp: 'audio/pickup_exp.mp3',
      levelup: 'audio/levelup.mp3',
      chest_open: 'audio/chest_open.mp3',
      relic: 'audio/relic_get.mp3',
      
      // UI 与系统
      ui_click: 'audio/ui_click.mp3',
      ui_error: 'audio/ui_error.mp3',
      warning: 'audio/warning.mp3',
      win: 'audio/victory.mp3',
      lose: 'audio/game_over.mp3',
      
      // 兼容旧代码
      shoot: 'audio/shoot_normal.mp3' // 向后兼容
    };

    this.contexts = {};
    this.musicContext = null;
    this.isMuted = false;

    // 预加载音效 (创建 Context)
    // 对于高频音效，可以创建多个实例池，这里为了简化使用单实例
    for (let key in this.sources) {
      try {
        const ctx = wx.createInnerAudioContext();
        ctx.src = this.sources[key];
        this.contexts[key] = ctx;
      } catch (e) {
        console.warn(`Failed to load audio: ${key}`, e);
      }
    }

    // BGM 特殊处理
    this.musicContext = this.contexts['bgm'];
    if (this.musicContext) {
      this.musicContext.loop = true;
      this.musicContext.volume = 0.6; // 背景乐稍微小声点
    }
  }

  /**
   * 播放音效
   * @param {string} name 音效名
   * @param {boolean} varyPitch 是否进行音高随机化（防止听觉疲劳）
   */
  play(name, varyPitch = false) {
    if (this.isMuted) return;
    
    const ctx = this.contexts[name];
    if (!ctx) {
      // 如果找不到指定音效，尝试使用默认音效
      if (name !== 'shoot' && name.startsWith('shoot_')) {
        ctx = this.contexts['shoot_normal'];
      } else if (name.startsWith('explosion')) {
        ctx = this.contexts['explosion'];
      }
      if (!ctx) return;
    }
    
    // 如果是短音效，必须重置时间，否则播放完一次后再调 play 没声音
    if (name !== 'bgm') {
      ctx.stop();
      ctx.seek(0);
      
      // 音高随机化：在 0.9 到 1.1 之间随机，制造细微差异
      // 注意：微信 InnerAudioContext 的 playbackRate 支持 Android/iOS
      // 范围 0.5 - 2.0。1.0 是原速。
      if (varyPitch) {
        const rate = 0.9 + Math.random() * 0.2; // 0.9 ~ 1.1
        ctx.playbackRate = rate;
      } else {
        ctx.playbackRate = 1.0;
      }
    }
    
    ctx.play();
  }

  playBgm() {
    if (this.isMuted) return;
    this.musicContext.play();
  }

  stopBgm() {
    this.musicContext.stop();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBgm();
    } else {
      this.playBgm();
    }
  }
}

// 单例导出
export const audio = new AudioManager();

