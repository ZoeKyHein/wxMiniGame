// --- START OF FILE js/core/achievements.js ---
import { ItemRegistry } from '../data/items.js';

export const Achievements = [
  { id: 'kill_100', desc: '累计击杀 100 敌人', target: 100, type: 'kill_count', rewardItem: 'boot_2' },
  { id: 'kill_1000', desc: '累计击杀 1000 敌人', target: 1000, type: 'kill_count', rewardItem: 'muscle_belt' },
  { id: 'kill_10000', desc: '累计击杀 10000 敌人', target: 10000, type: 'kill_count', rewardItem: 'vampire_tooth' },
  { id: 'die_once', desc: '第一次死亡', target: 1, type: 'death_count', rewardItem: 'cursed_mask' },
  { id: 'survive_5m', desc: '单局存活 5 分钟', target: 300, type: 'max_time', rewardItem: 'iron_heart' },
  { id: 'survive_10m', desc: '单局存活 10 分钟', target: 600, type: 'max_time', rewardItem: 'ice_crown' },
  { id: 'survive_15m', desc: '单局存活 15 分钟', target: 900, type: 'max_time', rewardItem: 'berserker_rage' },
  { id: 'kill_boss', desc: '击败 Boss', target: 1, type: 'boss_kills', rewardItem: 'golden_touch' },
  { id: 'collect_10_items', desc: '累计获得 10 个道具', target: 10, type: 'items_collected', rewardItem: 'lucky_coin' },
  { id: 'collect_50_items', desc: '累计获得 50 个道具', target: 50, type: 'items_collected', rewardItem: 'chain_reaction' }
];

export default class AchievementManager {
  constructor() {
    // 从本地存储读取统计数据
    this.stats = wx.getStorageSync('game_stats') || {
      kill_count: 0,
      death_count: 0,
      max_time: 0,
      boss_kills: 0,
      items_collected: 0
    };
    this.unlockedAchievements = wx.getStorageSync('unlocked_achievements') || [];
    this.pendingNotifications = []; // 待显示的通知
  }

  // 提交统计数据
  report(type, amount) {
    // 累加或更新最大值
    if (type === 'max_time') {
      this.stats[type] = Math.max(this.stats[type] || 0, amount);
    } else {
      this.stats[type] = (this.stats[type] || 0) + amount;
    }
    
    const hasNew = this.check();
    this.save();
    return hasNew;
  }

  check() {
    let hasNew = false;
    Achievements.forEach(ach => {
      if (this.unlockedAchievements.includes(ach.id)) return;
      
      const currentVal = this.stats[ach.type] || 0;
      if (currentVal >= ach.target) {
        this.unlock(ach);
        hasNew = true;
      }
    });
    return hasNew;
  }

  unlock(ach) {
    this.unlockedAchievements.push(ach.id);
    console.log(`成就解锁: ${ach.desc}`);
    
    // 解锁物品
    let unlockedItems = wx.getStorageSync('unlocked_items') || [];
    if (!unlockedItems.includes(ach.rewardItem)) {
      unlockedItems.push(ach.rewardItem);
      wx.setStorageSync('unlocked_items', unlockedItems);
      
      // 添加到待通知列表
      const itemName = ItemRegistry[ach.rewardItem]?.name || '未知道具';
      this.pendingNotifications.push({
        title: `成就解锁: ${ach.desc}`,
        item: itemName
      });
    }
  }

  // 获取待显示的通知
  getNextNotification() {
    return this.pendingNotifications.shift();
  }

  save() {
    wx.setStorageSync('game_stats', this.stats);
    wx.setStorageSync('unlocked_achievements', this.unlockedAchievements);
  }
  
  // 获取成就进度
  getProgress(achievementId) {
    const ach = Achievements.find(a => a.id === achievementId);
    if (!ach) return { current: 0, target: 0, progress: 0 };
    
    const current = this.stats[ach.type] || 0;
    const progress = Math.min(1, current / ach.target);
    return { current, target: ach.target, progress };
  }
}

