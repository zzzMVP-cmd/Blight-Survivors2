'use strict';

// 各英雄的攻击判定系统。每个英雄的判定逻辑不同，在此统一管理。
const Attack = {

  DAMAGE_TYPES: {
    sharp: { icon: '🗡', color: '#b91c1c' }
  },

  PIERCE_MULT_PER_LEVEL: 0.05,

  KNOCKBACK_SPEED: 200,
  KNOCKBACK_DURATION: 0.15,

  processWarrior(player, weapon, monsters) {
    for (const arc of weapon.arcs) {
      // 蓄力把多次攻击合并为一次：伤害先求和（不经过暴击），再统一判定暴击、穿透
      const attackTimes = arc.charged ? arc.chargeCount : 1;

      for (const m of monsters) {
        if (arc.hitSet.has(m)) continue;
        if (m.hp <= 0) continue;

        const dx = m.x - arc.playerX;
        const dy = m.y - arc.playerY;
        const reach = arc.radius + m.radius;

        // 轴对齐包围盒快速剔除：远处怪物只做两次绝对值比较，不做开方
        if (dx > reach || dx < -reach || dy > reach || dy < -reach) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < reach) {
          const angleToM = Math.atan2(dy, dx);
          const diff = this.normalizeAngle(angleToM - arc.facingAngle);
          if (Math.abs(diff) < arc.swingAngle / 2) {
            let dmg = Augment.calcDamage(player, weapon.DAMAGE * attackTimes);
            const isCrit = Crit.check(player);
            if (isCrit) dmg = Crit.calcDamage(player, dmg);

            if (m.shield > 0) dmg = dmg / m.shield;

            const volume = Math.PI * Math.pow(m.radius, 3);
            const threshold = (m.hp + m.shield) / volume;
            const pierce = dmg > threshold;
            if (pierce) {
              dmg = dmg * (1 + this.PIERCE_MULT_PER_LEVEL * Math.max(1, player.level));
            }

            dmg = Math.max(1, Math.round(dmg));

            const absorbed = Math.min(m.shield, dmg);
            m.shield -= absorbed;
            m.hp -= (dmg - absorbed);
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
  MAX_RENDER: 100,

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

    const item = {
      x: x + (Math.random() - 0.5) * 10,
      y: y,
      text: text,
      value: value,
      color: color,
      timer: this.DURATION,
      maxTimer: this.DURATION
    };

    if (this.items.length < this.MAX_RENDER) {
      this.items.push(item);
      return;
    }

    let minIdx = 0;
    for (let i = 1; i < this.items.length; i++) {
      if (this.items[i].value < this.items[minIdx].value) minIdx = i;
    }
    if (value > this.items[minIdx].value) this.items[minIdx] = item;
  },

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const d = this.items[i];
      d.timer -= dt;
      d.y -= this.RISE_SPEED * dt;
      if (d.timer <= 0) this.items.splice(i, 1);
    }
  },

  // 数组在 add() 时已保证只保留数值最高的 MAX_RENDER 条，此处直接绘制
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