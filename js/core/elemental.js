import { ElementType, ReactionType } from '../base/constants.js';

export default class ElementalSystem {
  /**
   * 计算伤害和反应
   * @param {string} targetElement - 目标当前附着的元素
   * @param {string} triggerElement - 攻击来源的元素
   * @param {number} baseDamage - 基础伤害
   * @returns {Object} { damage, reaction, remainingElement }
   */
  static calculate(targetElement, triggerElement, baseDamage) {
    let result = {
      damage: baseDamage,
      reaction: ReactionType.NONE,
      remainingElement: triggerElement // 默认新的附着元素是攻击者的元素
    };

    // 1. 蒸发反应 (水+火 或 火+水)
    if (
      (targetElement === ElementType.WATER && triggerElement === ElementType.FIRE) ||
      (targetElement === ElementType.FIRE && triggerElement === ElementType.WATER)
    ) {
      result.reaction = ReactionType.VAPORIZE;
      result.damage = baseDamage * 2.0; // 蒸发造成 2 倍伤害
      result.remainingElement = ElementType.NONE; // 反应后元素消除
      console.log("触发反应：蒸发！伤害翻倍:", result.damage);
    }
    // 2. 超载反应 (火+雷 或 雷+火) - AoE 爆炸
    else if (
      (targetElement === ElementType.FIRE && triggerElement === ElementType.LIGHTNING) ||
      (targetElement === ElementType.LIGHTNING && triggerElement === ElementType.FIRE)
    ) {
      result.reaction = ReactionType.OVERLOAD;
      result.damage = baseDamage * 1.5; // 超载造成 1.5 倍伤害
      result.remainingElement = ElementType.NONE; // 反应后元素消除
      result.isAoE = true; // 标记为 AoE 效果
      result.aoeRadius = 80; // AoE 范围
      result.aoeDamage = baseDamage * 0.5; // AoE 伤害为基础伤害的 50%
      console.log("触发反应：超载！AoE 爆炸:", result.damage);
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
      default: return '#ffffff';
    }
  }
}