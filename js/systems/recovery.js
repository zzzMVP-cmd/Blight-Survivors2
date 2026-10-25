'use strict';

// 恢复系统：每秒回复 recoveryLv × heroLevel 的血量
const Recovery = {
  update(dt, player) {
    if (player.recoveryLv <= 0) return;
    const hpPerSec = player.recoveryLv * player.level;
    player.hp = Math.min(player.maxHp, player.hp + hpPerSec * dt);
  }
};