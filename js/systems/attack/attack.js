'use strict';

// 各英雄的攻击判定系统。每个英雄的判定逻辑不同，在此统一管理。
const Attack = {

  DAMAGE_TYPES: {
    sharp: { icon: '🗡', color: '#b91c1c' }
  },

  PIERCE_BASE: 150,
  PIERCE_PER_WAVE: 35,
  PIERCE_MULT_PER_LEVEL: 0.05,

  KNOCKBACK_SPEED: 200,
  KNOCKBACK_DURATION: 0.15,

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
            let dmg = Augment.calcDamage(player, weapon.DAMAGE);
            const isCrit = Crit.check(player);
            if (isCrit) dmg = Crit.calcDamage(player, dmg);

            dmg = Math.round(dmg);

            const threshold = this.PIERCE_BASE + this.PIERCE_PER_WAVE * (Math.max(1, Wave.wave) - 1);
            const pierce = dmg > threshold;
            if (pierce) {
              dmg = Math.round(dmg * (1 + this.PIERCE_MULT_PER_LEVEL * Math.max(1, player.level)));
            }

            m.hp -= dmg;
            arc.hitSet.add(m);

            const nd = dist || 1;
            m.kbVx = (dx / nd) * this.KNOCKBACK_SPEED;
            m.kbVy = (dy / nd) * this.KNOCKBACK_SPEED;
            m.kbTimer = this.KNOCKBACK_DURATION;

            DamageNumbers.add(m.x, m.y - m.radius - 8, dmg, isCrit, pierce);
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

  CRIT_ICON: '💥',
  CRIT_COLOR: '#ff4500',
  PIERCE_LABEL: '穿透',
  PIERCE_COLOR: '#b91c1c',

  add(x, y, value, isCrit, pierce) {
    const icon = (isCrit ? this.CRIT_ICON : '') + Attack.DAMAGE_TYPES.sharp.icon;
    const text = pierce
      ? icon + ' ' + this.PIERCE_LABEL + ' ' + value
      : icon + ' ' + value;

    let color = isCrit ? this.CRIT_COLOR : Attack.DAMAGE_TYPES.sharp.color;
    if (pierce) color = this.PIERCE_COLOR;

    this.items.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y,
      text: text,
      color: color,
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