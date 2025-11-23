// --- START OF FILE js/data/items.js ---

export const Rarity = {
  COMMON: 'common',     // 白
  UNCOMMON: 'uncommon', // 绿
  RARE: 'rare',         // 蓝
  EPIC: 'epic',         // 紫
  LEGENDARY: 'legendary', // 橙
  CURSED: 'cursed'      // 红（强力但有负面效果）
};

export const ItemType = {
  WEAPON: 'weapon',     // 主动武器
  PASSIVE: 'passive',   // 基础属性
  RELIC: 'relic'        // 特殊机制遗物
};

/**
 * 道具数据库
 * 
 * 结构说明：
 * - id: 唯一标识
 * - name: 显示名
 * - desc: 描述
 * - rarity: 稀有度
 * - tags: 标签（用于随机权重，如 ['fire', 'magic']）
 * - req: 前置条件数组 (例如 ['fire_ball_lv5'])
 * - stats: 直接修改属性 { atk: 10, speed: 1 }
 * - hooks: 事件钩子 { onHit, onKill, onTakeDamage... }
 */
export const ItemRegistry = {
  // --- 基础属性类 (50+ 种) ---
  'boot_1': {
    id: 'boot_1', name: '破旧草鞋', type: ItemType.PASSIVE, rarity: Rarity.COMMON,
    desc: '移动速度 +10%',
    stats: { speedPct: 0.1 }
  },
  'boot_2': {
    id: 'boot_2', name: '疾风之靴', type: ItemType.PASSIVE, rarity: Rarity.UNCOMMON,
    desc: '移动速度 +25%',
    stats: { speedPct: 0.25 }
  },
  'boot_3': {
    id: 'boot_3', name: '闪电靴', type: ItemType.PASSIVE, rarity: Rarity.RARE,
    desc: '移动速度 +50%',
    stats: { speedPct: 0.5 }
  },
  'muscle_belt': {
    id: 'muscle_belt', name: '巨人腰带', type: ItemType.PASSIVE, rarity: Rarity.UNCOMMON,
    desc: '生命上限 +50，体型变大',
    stats: { maxHp: 50, scale: 0.1 }
  },
  'glass_cannon': {
    id: 'glass_cannon', name: '玻璃大炮', type: ItemType.PASSIVE, rarity: Rarity.EPIC,
    desc: '攻击力 +100%，但生命上限 -50%',
    stats: { damageMultiplier: 1.0, maxHpPct: -0.5 }
  },
  'iron_heart': {
    id: 'iron_heart', name: '钢铁之心', type: ItemType.PASSIVE, rarity: Rarity.RARE,
    desc: '生命上限 +100',
    stats: { maxHp: 100 }
  },
  'sharp_claw': {
    id: 'sharp_claw', name: '利爪', type: ItemType.PASSIVE, rarity: Rarity.COMMON,
    desc: '基础伤害 +20%',
    stats: { damageMultiplier: 0.2 }
  },
  'crit_ring': {
    id: 'crit_ring', name: '暴击戒指', type: ItemType.PASSIVE, rarity: Rarity.UNCOMMON,
    desc: '暴击率 +15%',
    stats: { critRate: 0.15 }
  },
  'lucky_coin': {
    id: 'lucky_coin', name: '幸运硬币', type: ItemType.PASSIVE, rarity: Rarity.RARE,
    desc: '幸运值 +10，稀有道具出现率提升',
    stats: { luck: 10 }
  },

  // --- 元素类遗物 (配合之前的元素系统) ---
  'fire_heart': {
    id: 'fire_heart', name: '火元素之心', type: ItemType.RELIC, rarity: Rarity.RARE,
    desc: '造成火焰伤害时，恢复 1 点生命',
    tags: ['fire', 'heal'],
    hooks: {
      onDamageDealt: (ctx, target, damage, element) => {
        if (element === 'fire') {
          ctx.hero.hp = Math.min(ctx.hero.maxHp, ctx.hero.hp + 1);
        }
      }
    }
  },
  'ice_crown': {
    id: 'ice_crown', name: '寒冰王冠', type: ItemType.RELIC, rarity: Rarity.EPIC,
    desc: '附近的敌人会被自动减速',
    tags: ['ice', 'aura'],
    hooks: {
      onUpdate: (ctx) => {
        if (ctx.frameCount % 30 === 0) {
          ctx.game.enemies.forEach(e => {
            if (e.active && ctx.utils.getDist(ctx.hero, e) < 200) {
              e.freezeTimer = Math.max(e.freezeTimer, 30);
            }
          });
        }
      }
    }
  },
  'lightning_rod': {
    id: 'lightning_rod', name: '避雷针', type: ItemType.RELIC, rarity: Rarity.RARE,
    desc: '雷元素伤害 +50%，连锁范围 +100',
    tags: ['lightning'],
    stats: { lightningDamagePct: 0.5 }
  },
  'water_orb': {
    id: 'water_orb', name: '水之宝珠', type: ItemType.RELIC, rarity: Rarity.UNCOMMON,
    desc: '水元素伤害 +30%',
    tags: ['water'],
    stats: { waterDamagePct: 0.3 }
  },

  // --- 机制类遗物 (核心玩法改变) ---
  'vampire_tooth': {
    id: 'vampire_tooth', name: '吸血鬼獠牙', type: ItemType.RELIC, rarity: Rarity.LEGENDARY,
    desc: '击杀敌人回复 2% 生命值',
    hooks: {
      onKill: (ctx, enemy) => {
        const healAmt = Math.max(1, Math.floor(ctx.hero.maxHp * 0.02));
        ctx.hero.hp = Math.min(ctx.hero.maxHp, ctx.hero.hp + healAmt);
        if (healAmt > 0 && ctx.game && ctx.game.floatingTexts) {
          // 使用游戏实例的方法创建 FloatingText
          if (ctx.game.FloatingText) {
            ctx.game.floatingTexts.push(new ctx.game.FloatingText(
              ctx.hero.x, ctx.hero.y - 20, `+${healAmt}`, '#2ecc71', 20
            ));
          }
        }
      }
    }
  },
  'thorns_armor': {
    id: 'thorns_armor', name: '荆棘甲', type: ItemType.RELIC, rarity: Rarity.RARE,
    desc: '受到伤害时，反弹 200% 伤害给攻击者',
    hooks: {
      onTakeDamage: (ctx, attacker, amount) => {
        if (attacker && attacker.hp !== undefined && ctx.game && ctx.game.FloatingText) {
          const reflectDamage = Math.floor(amount * 2);
          attacker.hp -= reflectDamage;
          if (attacker.hp <= 0) attacker.active = false;
          ctx.game.floatingTexts.push(new ctx.game.FloatingText(
            attacker.x, attacker.y - 20, `-${reflectDamage}`, '#fff', 18
          ));
        }
      }
    }
  },
  'coin_gun': {
    id: 'coin_gun', name: '金钱镖', type: ItemType.RELIC, rarity: Rarity.EPIC,
    desc: '攻击时消耗 1 金币，造成额外 50 真实伤害',
    hooks: {
      onAttack: (ctx, bullet) => {
        if (ctx.game.totalCoins > 0) {
          ctx.game.totalCoins--;
          bullet.damage = (bullet.damage || 2) + 50;
        }
      }
    }
  },
  'explosive_corpse': {
    id: 'explosive_corpse', name: '尸爆', type: ItemType.RELIC, rarity: Rarity.RARE,
    desc: '击杀敌人时产生爆炸',
    hooks: {
      onKill: (ctx, enemy) => {
        if (ctx.game && ctx.game.spawnExplosion && ctx.game.handleOverloadAoE) {
          ctx.game.spawnExplosion(enemy.x, enemy.y, '#e74c3c', 15);
          ctx.game.handleOverloadAoE(enemy.x, enemy.y, 100, 30);
        }
      }
    }
  },
  'poison_trail': {
    id: 'poison_trail', name: '毒液路径', type: ItemType.RELIC, rarity: Rarity.UNCOMMON,
    desc: '移动时留下毒云',
    hooks: {
      onMove: (ctx) => {
        if (ctx.frameCount % 10 === 0) {
          // 在身后生成毒云粒子
          ctx.game.spawnExplosion(ctx.hero.x, ctx.hero.y, '#2ecc71', 3);
        }
      }
    }
  },
  'bloodlust': {
    id: 'bloodlust', name: '嗜血', type: ItemType.RELIC, rarity: Rarity.EPIC,
    desc: '击杀敌人时，攻击速度 +5%，最多叠加 10 层',
    hooks: {
      onKill: (ctx, enemy) => {
        ctx.hero.killStack = (ctx.hero.killStack || 0) + 1;
        if (ctx.hero.killStack <= 10) {
          ctx.hero.attackInterval = Math.max(5, Math.floor(ctx.hero.attackInterval * 0.95));
        }
      }
    }
  },
  'shield_generator': {
    id: 'shield_generator', name: '护盾生成器', type: ItemType.RELIC, rarity: Rarity.RARE,
    desc: '每 5 秒获得 10 点护盾（最多 50）',
    stats: { shield: 0, maxShield: 50 },
    hooks: {
      onUpdate: (ctx) => {
        if (ctx.frameCount % 300 === 0) {
          ctx.hero.shield = Math.min(ctx.hero.maxShield || 50, (ctx.hero.shield || 0) + 10);
        }
      }
    }
  },
  'golden_touch': {
    id: 'golden_touch', name: '点石成金', type: ItemType.RELIC, rarity: Rarity.LEGENDARY,
    desc: '击杀敌人时额外掉落金币',
    hooks: {
      onKill: (ctx, enemy) => {
        if (ctx.game && ctx.game.orbs && ctx.game.ExpOrb && ctx.game.PickupType) {
          ctx.game.orbs.push(new ctx.game.ExpOrb(enemy.x, enemy.y, ctx.game.PickupType.COIN, 20));
        }
      }
    }
  },
  'berserker_rage': {
    id: 'berserker_rage', name: '狂战士之怒', type: ItemType.RELIC, rarity: Rarity.EPIC,
    desc: '生命值低于 30% 时，伤害 +100%',
    hooks: {
      onDamageDealt: (ctx, target, damage, element) => {
        const hpRatio = ctx.hero.hp / ctx.hero.maxHp;
        if (hpRatio < 0.3) {
          return damage * 2;
        }
        return damage;
      }
    }
  },
  'chain_reaction': {
    id: 'chain_reaction', name: '连锁反应', type: ItemType.RELIC, rarity: Rarity.RARE,
    desc: '暴击时触发连锁爆炸',
    hooks: {
      onCrit: (ctx, enemy, damage) => {
        ctx.game.spawnExplosion(enemy.x, enemy.y, '#f1c40f', 10);
        ctx.game.handleOverloadAoE(enemy.x, enemy.y, 80, damage * 0.5);
      }
    }
  },

  // --- 诅咒类 (高风险高回报) ---
  'cursed_mask': {
    id: 'cursed_mask', name: '痛苦面具', type: ItemType.RELIC, rarity: Rarity.CURSED,
    desc: '敌人数量 +50%，经验获取 +50%',
    stats: { expMultiplier: 0.5 }
  },
  'demonic_pact': {
    id: 'demonic_pact', name: '恶魔契约', type: ItemType.RELIC, rarity: Rarity.CURSED,
    desc: '伤害 +200%，但每秒扣 1% 生命',
    stats: { damageMultiplier: 1.0 },
    hooks: {
      onUpdate: (ctx) => {
        if (ctx.frameCount % 60 === 0) {
          const damage = Math.max(1, Math.floor(ctx.hero.maxHp * 0.01));
          ctx.hero.takeDamage(damage);
        }
      }
    }
  },

  // --- 更多基础属性类 ---
  'health_potion': {
    id: 'health_potion', name: '生命药水', type: ItemType.PASSIVE, rarity: Rarity.COMMON,
    desc: '生命上限 +20',
    stats: { maxHp: 20 }
  },
  'power_ring': {
    id: 'power_ring', name: '力量之戒', type: ItemType.PASSIVE, rarity: Rarity.UNCOMMON,
    desc: '伤害 +30%',
    stats: { damageMultiplier: 0.3 }
  },
  'speed_boots': {
    id: 'speed_boots', name: '速度之靴', type: ItemType.PASSIVE, rarity: Rarity.COMMON,
    desc: '移动速度 +15%',
    stats: { speedPct: 0.15 }
  },
  'armor_plate': {
    id: 'armor_plate', name: '护甲板', type: ItemType.PASSIVE, rarity: Rarity.UNCOMMON,
    desc: '受到伤害 -20%',
    stats: { damageReduction: 0.2 }
  },
  'pierce_arrow': {
    id: 'pierce_arrow', name: '穿透箭', type: ItemType.PASSIVE, rarity: Rarity.RARE,
    desc: '子弹穿透 +2',
    stats: { pierceCount: 2 }
  },
  'multishot': {
    id: 'multishot', name: '多重射击', type: ItemType.PASSIVE, rarity: Rarity.UNCOMMON,
    desc: '子弹数量 +1',
    stats: { projectileCount: 1 }
  },
  'rapid_fire': {
    id: 'rapid_fire', name: '快速射击', type: ItemType.PASSIVE, rarity: Rarity.COMMON,
    desc: '攻击速度 +20%',
    stats: { attackSpeedPct: 0.2 }
  }
};

