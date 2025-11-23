import { ElementType } from './constants.js';

export const Characters = {
  mage: {
    id: 'mage',
    name: '元素法师',
    desc: '被动：子弹元素自动轮转\n增益：反应伤害 +50%',
    color: '#9b59b6',
    baseHp: 80,
    baseSpeed: 4,
    startElement: ElementType.FIRE,
    trait: 'prismatic'
  },
  berserker: {
    id: 'berserker',
    name: '狂战士',
    desc: '被动：杀敌提升生命上限\n惩罚：无法从升级中回血',
    color: '#c0392b',
    baseHp: 150,
    baseSpeed: 5,
    startElement: ElementType.FIRE,
    trait: 'blood_pact'
  },
  ranger: {
    id: 'ranger',
    name: '游侠',
    desc: '被动：初始拥有穿透与暴击',
    color: '#2ecc71',
    baseHp: 100,
    baseSpeed: 4.5,
    startElement: ElementType.FIRE,
    trait: 'none'
  }
};


