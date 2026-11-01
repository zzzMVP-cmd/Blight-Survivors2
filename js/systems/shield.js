'use strict';

// 护盾系统：英雄护盾的基础值计算、受击结算、强化成长
const Shield = {
  BASE_PER_50_LEVELS: 10,

  // 每升 50 级，基础护盾 +10
  calcBase(level) {
    return Math.floor(Math.max(0, level) / 50) * this.BASE_PER_50_LEVELS;
  },

  // 按当前等级与强化倍率刷新最大护盾，并把提升的部分补进当前护盾
  refresh(player) {
    const newMax = Math.round(this.calcBase(player.level) * player.shieldMult);
    const delta = newMax - player.maxShield;
    player.maxShield = newMax;
    if (delta > 0) player.shield = Math.min(newMax, player.shield + delta);
    else player.shield = Math.min(player.shield, newMax);
  },

  // 护盾强化卡：最大护盾按倍率成长，当前护盾同步乘算（四舍五入）
  grow(player, mult) {
    player.shieldMult *= mult;
    const newMax = Math.round(this.calcBase(player.level) * player.shieldMult);
    player.maxShield = newMax;
    player.shield = Math.min(newMax, Math.round(player.shield * mult));
  },

  // 英雄受击：非特殊伤害先除以护盾值，再优先扣除护盾，溢出部分扣血
  applyDamage(player, damage) {
    let final = damage;
    if (player.shield > 0) final = final / player.shield;
    final = Math.round(final);

    const absorbed = Math.min(player.shield, final);
    player.shield -= absorbed;

    const toHp = final - absorbed;
    if (toHp > 0) player.hp = Math.max(0, player.hp - toHp);

    return final;
  }
};