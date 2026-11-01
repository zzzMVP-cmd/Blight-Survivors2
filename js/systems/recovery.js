'use strict';

// 恢复系统：每秒回复 recoveryLv × heroLevel 的血量，血量满后再回护盾
const Recovery = {
  update(dt, player) {
    if (player.recoveryLv <= 0) return;

    let heal = player.recoveryLv * player.level * dt;

    const hpGap = player.maxHp - player.hp;
    const toHp = Math.min(hpGap, heal);
    player.hp += toHp;
    heal -= toHp;

    if (heal > 0 && player.maxShield > 0) {
      player.shield = Math.min(player.maxShield, player.shield + heal);
    }
  }
};