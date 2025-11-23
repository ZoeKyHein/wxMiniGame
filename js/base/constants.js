export const ElementType = {
  NONE: 'none',
  FIRE: 'fire',   // 火
  WATER: 'water', // 水
  LIGHTNING: 'lightning', // 雷
  ICE: 'ice', // 新增：冰
};

export const ReactionType = {
  NONE: 'none',
  VAPORIZE: 'vaporize', // 蒸发 (水+火)
  OVERLOAD: 'overload', // 超载 (火+雷) - AoE 爆炸
  FREEZE: 'freeze',     // 冻结 (水+冰) - 强控
  MELT: 'melt',         // 融化 (火+冰) - 增伤
  SUPERCONDUCT: 'superconduct' // 超导 (雷+冰) - 范围减防/伤
};

export const PickupType = {
  EXP: 'exp',
  COIN: 'coin',
  HEALTH: 'health',
  MAGNET: 'magnet' // 新增：磁铁道具
};