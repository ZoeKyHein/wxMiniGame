import { ElementType, ReactionType } from '../base/constants.js';

export default class ElementalSystem {
  /**
   * 计算伤害和反应
   * @param {string} targetElement - 目标当前附着的元素
   * @param {string} triggerElement - 攻击来源的元素
   * @param {number} baseDamage - 基础伤害
   * @param {Object} levels - 玩家的元素等级对象 { fire: 1, water: 0 ... }
   * @returns {Object} { damage, reaction, remainingElement }
   */
  static calculate(targetElement, triggerElement, baseDamage, levels) {
    let result = {
      damage: baseDamage,
      reaction: ReactionType.NONE,
      remainingElement: triggerElement, // 默认新的附着元素是攻击者的元素
      aoeRange: 0,
      aoeDamage: null,
      knockback: 0,
      effect: null // 新增：特殊效果 (如 freeze, slow)
    };
    
    // 获取当前触发元素的等级 (默认为1，防止未定义)
    const level = levels ? (levels[triggerElement] || 1) : 1;
    
    // 基础元素效果 (无反应时也要生效)
    if (triggerElement === ElementType.FIRE) {
      result.effect = { 
        type: 'burn', 
        duration: 60 + (level - 1) * 30, 
        damage: Math.max(1, Math.floor(baseDamage * (0.2 * level))) 
      };
      // 火自带小范围溅射
      result.aoeRange = 30 + level * 5;
    }
    else if (triggerElement === ElementType.WATER) {
      // 水自带击退
      result.knockback = 15 + level * 5;
    }
    else if (triggerElement === ElementType.ICE) {
      // 冰有几率直接冻结
      const freezeChance = 0.1 + level * 0.02;
      if (Math.random() < freezeChance) {
        result.effect = { type: 'freeze', duration: 30 };
      }
    }

    // 1. 冻结 (水 + 冰)
    if (
      (targetElement === ElementType.WATER && triggerElement === ElementType.ICE) ||
      (targetElement === ElementType.ICE && triggerElement === ElementType.WATER)
    ) {
      result.reaction = ReactionType.FREEZE;
      result.damage = baseDamage; // 伤害不变
      // 冰等级影响冻结时长
      const iceLv = levels ? (levels[ElementType.ICE] || 1) : 1;
      result.effect = { type: 'freeze', duration: 60 + (iceLv - 1) * 20 };
      result.remainingElement = ElementType.NONE;
    }
    // 2. 融化 (火 + 冰)
    else if (
      (targetElement === ElementType.FIRE && triggerElement === ElementType.ICE) ||
      (targetElement === ElementType.ICE && triggerElement === ElementType.FIRE)
    ) {
      result.reaction = ReactionType.MELT;
      result.damage = baseDamage * 2.0; // 2倍伤害
      result.remainingElement = ElementType.NONE;
    }
    // 3. 超导 (雷 + 冰)
    else if (
      (targetElement === ElementType.LIGHTNING && triggerElement === ElementType.ICE) ||
      (targetElement === ElementType.ICE && triggerElement === ElementType.LIGHTNING)
    ) {
      result.reaction = ReactionType.SUPERCONDUCT;
      result.damage = baseDamage * 1.5;
      result.aoeRange = 80; // 小范围爆炸
      result.aoeDamage = baseDamage * 0.5;
      result.remainingElement = ElementType.NONE;
    }
    // 4. 蒸发反应 (水+火 或 火+水)
    else if (
      (targetElement === ElementType.WATER && triggerElement === ElementType.FIRE) ||
      (targetElement === ElementType.FIRE && triggerElement === ElementType.WATER)
    ) {
      result.reaction = ReactionType.VAPORIZE;
      result.damage = baseDamage * 2.0; // 蒸发造成 2 倍伤害
      result.remainingElement = ElementType.NONE; // 反应后元素消除
    }
    // 5. 超载反应 (火+雷 或 雷+火) - AoE 爆炸
    else if (
      (targetElement === ElementType.FIRE && triggerElement === ElementType.LIGHTNING) ||
      (targetElement === ElementType.LIGHTNING && triggerElement === ElementType.FIRE)
    ) {
      result.reaction = ReactionType.OVERLOAD;
      result.damage = baseDamage * 1.5; // 超载造成 1.5 倍伤害
      result.remainingElement = ElementType.NONE; // 反应后元素消除
      // 雷等级影响爆炸范围
      const lightningLv = levels ? (levels[ElementType.LIGHTNING] || 1) : 1;
      result.aoeRange = 100 + (lightningLv - 1) * 25; // AoE 范围
      result.aoeDamage = baseDamage * 0.5; // AoE 伤害为基础伤害的 50%
      result.knockback = 40;
    }
    
    // 如果目标没有元素，或者没有触发反应，则覆盖为新的元素
    // (这里简化逻辑：后来的元素直接覆盖旧元素，除非发生了反应消除了它)
    
    return result;
  }
  
  /**
   * 获取元素对应的颜色（用于渲染敌人状态）
   */
  static getColor(element) {
    switch (element) {
      case ElementType.FIRE: return '#e74c3c'; // 红色
      case ElementType.WATER: return '#3498db'; // 蓝色
      case ElementType.LIGHTNING: return '#f39c12'; // 橙色/金色
      case ElementType.ICE: return '#74b9ff'; // 浅蓝
      default: return '#ffffff'; // 默认白色/无色
    }
  }
  
  /**
   * 获取反应对应的颜色（用于浮动文字显示）
   */
  static getReactionColor(reaction) {
    switch (reaction) {
      case ReactionType.VAPORIZE: return '#3498db'; // 蓝色（水蒸气）
      case ReactionType.OVERLOAD: return '#f39c12'; // 橙色（爆炸）
      case ReactionType.FREEZE: return '#74b9ff'; // 浅蓝（冻结）
      case ReactionType.MELT: return '#e74c3c'; // 红色（融化）
      case ReactionType.SUPERCONDUCT: return '#9b59b6'; // 紫色（超导）
      default: return '#ffffff';
    }
  }
}