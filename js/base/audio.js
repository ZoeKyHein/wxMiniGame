export default class AudioManager {
  constructor() {
    this.sources = {
      bgm: 'audio/bgm.mp3',
      shoot: 'audio/shoot.mp3',
      explosion: 'audio/explosion.mp3',
      levelup: 'audio/levelup.mp3',
      win: 'audio/win.mp3',
      lose: 'audio/lose.mp3'
    };

    this.contexts = {};
    this.musicContext = null;
    this.isMuted = false;

    // 预加载音效 (创建 Context)
    for (let key in this.sources) {
      const ctx = wx.createInnerAudioContext();
      ctx.src = this.sources[key];
      this.contexts[key] = ctx;
    }

    // BGM 特殊处理
    this.musicContext = this.contexts['bgm'];
    this.musicContext.loop = true;
    this.musicContext.volume = 0.6; // 背景乐稍微小声点
  }

  play(name) {
    if (this.isMuted) return;
    
    const ctx = this.contexts[name];
    if (ctx) {
      // 如果是短音效，必须重置时间，否则播放完一次后再调 play 没声音
      // 对于高频音效（如射击），最佳实践是使用 WebAudio API，但微信小游戏简单版用 seek(0) 凑合
      if (name !== 'bgm') {
        ctx.stop();
        ctx.seek(0);
      }
      ctx.play();
    }
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

