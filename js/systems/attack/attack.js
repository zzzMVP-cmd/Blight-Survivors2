'use strict';

// 各英雄的攻击判定系统。每个英雄的判定逻辑不同，在此统一管理。
const Attack = {

  DAMAGE_TYPES: {
    sharp: { icon: '🗡', color: '#b91c1c' },
    blunt: { icon: '🔨', color: '#8b9bb4' }
  },

  PIERCE_MULT_PER_LEVEL: 0.05,

  // 击退基础速度。实际值存在 player.knockbackSpeed 上，可被武器强化提升
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
            // 锐器伤与钝器伤分开算基础值，但暴击只判定一次：两种伤害一起乘暴击倍率
            let sharp = Augment.calcDamage(player, weapon.DAMAGE * attackTimes);
            let blunt = Augment.calcDamage(player, player.bluntDamage * attackTimes);
            const isCrit = Crit.check(player);
            if (isCrit) {
              sharp = Crit.calcDamage(player, sharp);
              blunt = Crit.calcDamage(player, blunt);
            }

            // 钝器伤对带护盾的怪物单独结算：(x + y) × min(y+1, shield) / shield
            // 没有护盾时不套这个公式，按普通叠加结算
            const mult = m.shield > 0 ? Math.min(blunt + 1, m.shield) / m.shield : 1;

            // 穿透只作用于锐器伤：钝器伤没有穿透。
            // 判定用「经过护盾压制后的锐器伤」与「(最大血量 + 当前护盾) / 体积」比较，
            // 即护盾后判定：护盾越厚，实际能用于穿透的锐器伤越低，越难触发。
            const area = Math.PI * m.radius * m.radius;
            const threshold = (m.maxHp + m.shield) / area;
            const pierce = sharp * mult > threshold;
            if (pierce) {
              sharp = sharp * (1 + this.PIERCE_MULT_PER_LEVEL * Math.max(1, player.level));
            }

            const parts = [];
            if (sharp > 0) parts.push({ type: 'sharp', value: sharp * mult, pierce: pierce });
            if (blunt > 0) parts.push({ type: 'blunt', value: blunt * mult, pierce: false });
            parts.sort((a, b) => b.value - a.value);

            const dmg = Math.max(1, Math.round((sharp + blunt) * mult));

            const absorbed = Math.min(m.shield, dmg);
            m.shield -= absorbed;
            m.hp -= (dmg - absorbed);
            arc.hitSet.add(m);

            const nd = dist || 1;
            m.kbVx = (dx / nd) * player.knockbackSpeed;
            m.kbVy = (dy / nd) * player.knockbackSpeed;
            m.kbTimer = this.KNOCKBACK_DURATION;

            DamageNumbers.add(m.x, m.y - m.radius - 8, {
              total: dmg,
              isCrit: isCrit,
              parts: parts.map((p) => ({
                icon: this.DAMAGE_TYPES[p.type].icon,
                color: this.DAMAGE_TYPES[p.type].color,
                value: Math.max(0, Math.round(p.value)),
                pierce: p.pierce
              })).filter((p) => p.value >= 1)
            });
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
// 多种伤害时最多 6 行：第一行是暴击图标 + 单次总伤害（白色），
// 之后每行一种伤害类型，从大到小排序，最多 5 行，颜色按攻击类型而定。
// 只有一种伤害时压成一行「暴击图标 类型图标 [穿透] 伤害」，颜色按该伤害类型。
const DamageNumbers = {
  items: [],
  DURATION: 0.8,
  RISE_SPEED: 60,
  MAX_RENDER: 100,

  CRIT_ICON: '💥',
  TOTAL_COLOR: '#ffffff',
  PIERCE_LABEL: '穿透',
  MAX_TYPE_LINES: 5,
  LINE_HEIGHT: 15,

  // data: { total, isCrit, parts: [{ icon, color, value, pierce }] }
  add(x, y, data) {
    const item = {
      x: x + (Math.random() - 0.5) * 10,
      y: y,
      isCrit: data.isCrit,
      total: data.total,
      parts: data.parts,
      timer: this.DURATION,
      maxTimer: this.DURATION
    };

    if (this.items.length < this.MAX_RENDER) {
      this.items.push(item);
      return;
    }

    let minIdx = 0;
    for (let i = 1; i < this.items.length; i++) {
      if (this.items[i].total < this.items[minIdx].total) minIdx = i;
    }
    if (item.total > this.items[minIdx].total) this.items[minIdx] = item;
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
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';

      const parts = d.parts.length > this.MAX_TYPE_LINES
        ? d.parts.slice(0, this.MAX_TYPE_LINES)
        : d.parts;

      // 只有一种伤害时不做两行，直接一行「暴击图标 类型图标 穿透 伤害」
      if (parts.length === 1) {
        const p = parts[0];
        const text = (d.isCrit ? this.CRIT_ICON + ' ' : '') +
          p.icon + ' ' + (p.pierce ? this.PIERCE_LABEL + ' ' : '') + p.value;
        this.fillLine(ctx, text, d.x, d.y, p.color);
        ctx.restore();
        continue;
      }

      const head = (d.isCrit ? this.CRIT_ICON + ' ' : '') + d.total;
      this.fillLine(ctx, head, d.x, d.y, this.TOTAL_COLOR);

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const text = p.icon + ' ' + (p.pierce ? this.PIERCE_LABEL + ' ' : '') + p.value;
        this.fillLine(ctx, text, d.x, d.y + this.LINE_HEIGHT * (i + 1), p.color);
      }

      ctx.restore();
    }
  },

  fillLine(ctx, text, x, y, color) {
    ctx.fillStyle = color;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  },

  clear() {
    this.items = [];
  }
};