export const ElementType = {
  NONE: 'none',
  FIRE: 'fire',   // 火
  WATER: 'water', // 水
  LIGHTNING: 'lightning', // 雷
  // 后续可以加 ICE(冰), EARTH(草/地)
};

export const ReactionType = {
  NONE: 'none',
  VAPORIZE: 'vaporize', // 蒸发 (水+火)
  OVERLOAD: 'overload', // 超载 (火+雷) - AoE 爆炸
};