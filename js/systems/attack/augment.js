'use strict';

// 增幅系统：计算表现增幅、溢出转化、实际伤害
const Augment = {
  calcDamage(player, baseDamage) {
    return baseDamage * player.displayPowerAug * player.overflowDmgMult;
  }
};