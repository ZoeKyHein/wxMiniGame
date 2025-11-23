// --- START OF FILE js/core/item_manager.js ---
import { ItemRegistry, Rarity } from '../data/items.js';
import { audio } from '../base/audio.js';

export default class ItemManager {
  constructor(game) {
    this.game = game;
    this.ownedItems = []; // 玩家当前持有的道具 ID
    this.itemHistory = wx.getStorageSync('unlocked_items') || []; // 图鉴记录
  }

  // 随机获取 N 个升级选项
  getUpgradeOptions(count = 3) {
    const pool = [];
    const heroStats = this.game.hero; // 获取主角当前状态用于判定前置

    for (let key in ItemRegistry) {
      const item = ItemRegistry[key];

      // 1. 过滤已拥有且不可堆叠的 (假设大部分遗物不可堆叠)
      if (item.type === 'relic' && this.ownedItems.includes(item.id)) continue;

      // 2. 检查前置条件 (req)
      if (item.req) {
        let meet = true;
        for (let r of item.req) {
          // 简单示例：前置可能是拥有某个ID的物品
          if (!this.ownedItems.includes(r)) meet = false;
        }
        if (!meet) continue;
      }

      // 3. 权重计算 (根据稀有度)
      let weight = 100;
      if (item.rarity === Rarity.UNCOMMON) weight = 60;
      if (item.rarity === Rarity.RARE) weight = 30;
      if (item.rarity === Rarity.EPIC) weight = 10;
      if (item.rarity === Rarity.LEGENDARY) weight = 2;
      if (item.rarity === Rarity.CURSED) weight = 5;
      
      // 4. 运气修正
      weight *= (1 + (heroStats.luck || 0) * 0.1);

      pool.push({ item, weight });
    }

    // 抽奖
    const results = [];
    for (let i = 0; i < count; i++) {
      if (pool.length === 0) break;
      const selected = this._weightedRandom(pool);
      if (selected) {
        results.push(selected.item);
        // 从临时池移除，防止单次三选一出现重复
        const idx = pool.findIndex(p => p.item.id === selected.item.id);
        if (idx > -1) pool.splice(idx, 1);
      }
    }
    return results;
  }

  _weightedRandom(pool) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    if (total === 0) return null;
    let r = Math.random() * total;
    for (let p of pool) {
      r -= p.weight;
      if (r <= 0) return p;
    }
    return pool[pool.length - 1];
  }

  // 玩家选择了某个道具
  acquireItem(itemId) {
    const item = ItemRegistry[itemId];
    if (!item) return;

    this.ownedItems.push(itemId);
    
    // 1. 解锁图鉴
    if (!this.itemHistory.includes(itemId)) {
      this.itemHistory.push(itemId);
      wx.setStorageSync('unlocked_items', this.itemHistory);
    }

    // 2. 应用属性
    if (item.stats) {
      for (let statKey in item.stats) {
        const val = item.stats[statKey];
        // 处理百分比
        if (statKey === 'speedPct') {
          this.game.hero.speed *= (1 + val);
        } else if (statKey === 'maxHpPct') {
          const oldMaxHp = this.game.hero.maxHp;
          this.game.hero.maxHp = Math.floor(this.game.hero.maxHp * (1 + val));
          const hpIncrease = this.game.hero.maxHp - oldMaxHp;
          this.game.hero.hp += hpIncrease; // 按比例增加当前血量
        } else if (statKey === 'maxHp') {
          this.game.hero.maxHp += val;
          this.game.hero.hp += val;
        } else if (statKey === 'damageMultiplier') {
          this.game.hero.damageMultiplier = (this.game.hero.damageMultiplier || 1) + val;
        } else if (statKey === 'critRate') {
          this.game.hero.critRate = Math.min(1.0, (this.game.hero.critRate || 0) + val);
        } else if (statKey === 'luck') {
          this.game.hero.luck = (this.game.hero.luck || 0) + val;
        } else if (statKey === 'pierceCount') {
          this.game.hero.pierceCount = (this.game.hero.pierceCount || 0) + val;
        } else if (statKey === 'projectileCount') {
          this.game.hero.projectileCount = (this.game.hero.projectileCount || 1) + val;
        } else if (statKey === 'attackSpeedPct') {
          this.game.hero.attackInterval = Math.max(5, Math.floor(this.game.hero.attackInterval / (1 + val)));
        } else if (statKey === 'damageReduction') {
          this.game.hero.damageReduction = (this.game.hero.damageReduction || 0) + val;
        } else if (statKey === 'scale') {
          this.game.hero.scale = (this.game.hero.scale || 1) + val;
        } else if (statKey === 'shield') {
          this.game.hero.shield = val;
        } else if (statKey === 'maxShield') {
          this.game.hero.maxShield = val;
        } else if (statKey === 'expMultiplier') {
          this.game.hero.expMultiplier = (this.game.hero.expMultiplier || 1) + val;
        }
        // 处理直接属性
        else if (this.game.hero[statKey] !== undefined) {
          this.game.hero[statKey] += val;
        }
      }
    }

    // 3. 注册 Hooks (最关键的一步)
    if (item.hooks) {
      for (let hookName in item.hooks) {
        this.game.hero.addHook(hookName, item.hooks[hookName]);
      }
    }

    console.log(`获得了: ${item.name}`);
    
    // 播放获得遗物音效
    audio.play('relic', false);
  }
}

