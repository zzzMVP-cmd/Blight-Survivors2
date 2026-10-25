'use strict';

// 各英雄的攻击判定系统。每个英雄的判定逻辑不同，在此统一管理。
const Attack = {

  DAMAGE_TYPES: {
    sharp: { icon: '🗡', color: '#b91c1c' }
  },

  KNOCKBACK_SPEED: 200,
  KNOCKBACK_DURATION: 0.15,

  processWarrior(player, weapon, monsters) {
    const dtype = this.DAMAGE_TYPES.sharp;

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

            const nd = dist || 1;
            m.kbVx = (dx / nd) * this.KNOCKBACK_SPEED;
            m.kbVy = (dy / nd) * this.KNOCKBACK_SPEED;
            m.kbTimer = this.KNOCKBACK_DURATION;

            DamageNumbers.add(m.x, m.y - m.radius - 8, weapon.DAMAGE, dtype);
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

// 伤害数字系统：浮动上升 + 渐隐
const DamageNumbers = {
  items: [],
  DURATION: 0.8,
  RISE_SPEED: 60,

  add(x, y, value, dtype) {
    this.items.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y,
      text: dtype.icon + value,
      color: dtype.color,
      timer: this.DURATION,
      maxTimer: this.DURATION
    });
  },

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const d = this.items[i];
      d.timer -= dt;
      d.y -= this.RISE_SPEED * dt;
      if (d.timer <= 0) this.items.splice(i, 1);
    }
  },

  draw(ctx) {
    for (const d of this.items) {
      const alpha = Math.min(1, d.timer / (d.maxTimer * 0.4));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = d.color;
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.strokeText(d.text, d.x, d.y);
      ctx.fillText(d.text, d.x, d.y);
      ctx.restore();
    }
  },

  clear() {
    this.items = [];
  }
};