export const Resources = {
  hero: 'images/hero.png',
  bg: 'images/bg.png',
  enemy_normal: 'images/enemy_normal.png',
  enemy_charger: 'images/enemy_charger.png',
  enemy_elite: 'images/enemy_elite.png',
  enemy_boss: 'images/enemy_boss.png',
  exp_orb: 'images/exp_orb.png',
  bullet: 'images/bullet_normal.png'
};

export default class ResourceLoader {
  constructor() {
    this.images = {};
    this.loadedCount = 0;
    this.totalCount = Object.keys(Resources).length;
  }

  load(callback) {
    for (let key in Resources) {
      const img = wx.createImage();
      img.src = Resources[key];
      img.onload = () => {
        this.images[key] = img;
        this.loadedCount++;
        if (this.loadedCount === this.totalCount) {
          callback(this.images);
        }
      };
      img.onerror = () => {
        console.log('资源加载失败:', key);
        // 即使失败也继续计数，防止卡死
        this.loadedCount++;
        if (this.loadedCount === this.totalCount) {
          callback(this.images);
        }
      };
    }
  }
}

