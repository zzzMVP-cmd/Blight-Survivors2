'use strict';

// 各英雄的攻击判定系统。每个英雄的判定逻辑不同，在此统一管理。
const Attack = {

  processWarrior(player, weapon, monsters) {
    for (const arc of weapon.arcs) {
      for (const m of monsters) {
        if (arc.hitSet.has(m)) continue;
        if (m.hp <= 0) continue;

        const dx = m.x - arc.playerX;
        const dy = m.y - arc.playerY;
        const dist = Math.hypot(dx, dy);

        if (dist < arc.radius + m.radius) {
          const angleToM = Math.atan2(dy, dx);
          const diff = this.normalizeAngle(angleToM - arc.facingAngle);
          if (Math.abs(diff) < arc.swingAngle / 2) {
            m.hp -= weapon.DAMAGE;
            arc.hitSet.add(m);
          }
        }
      }
    }
  },

  normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
};