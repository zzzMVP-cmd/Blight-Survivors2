'use strict';

// 暴击系统：暴击率 + 概率补偿机制 + 暴击伤害计算
const Crit = {
  check(player) {
    const effectiveRate = player.critRate + player.critComp;
    if (Math.random() < effectiveRate) {
      player.critComp = 0;
      return true;
    }
    player.critComp += player.critRate;
    if (player.critComp > 1) player.critComp = 1;
    return false;
  },

  calcDamage(player, baseDamage) {
    const lv = Math.max(1, player.level);
    return Math.max(1, Math.log2(lv)) * baseDamage;
  }
};