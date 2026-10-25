'use strict';

// 经验球：怪物死亡时掉落，玩家走过去拾取，经验 = 怪物 maxHp
const ExpOrbs = {
  orbs: [],
  PICKUP_RANGE: 28,
  ATTRACT_RANGE: 80,
  ATTRACT_SPEED: 300,
  BOB_SPEED: 3,
  BOB_AMP: 3,

  spawn(x, y, exp) {
    this.orbs.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      exp: exp,
      time: 0,
      r: Math.max(4, Math.min(8, Math.sqrt(exp) * 0.8))
    });
  },

  update(dt, player) {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      orb.time += dt;

      const dx = player.x - orb.x;
      const dy = player.y - orb.y;
      const dist = Math.hypot(dx, dy);

      if (dist < this.ATTRACT_RANGE && dist > 0) {
        const speed = this.ATTRACT_SPEED * (1 - dist / this.ATTRACT_RANGE);
        orb.x += (dx / dist) * speed * dt;
        orb.y += (dy / dist) * speed * dt;
      }

      if (dist < this.PICKUP_RANGE) {
        player.exp += orb.exp;
        while (player.exp >= player.expNext) {
          player.exp -= player.expNext;
          player.level += 1;
          player.expNext = Math.round(player.expNext * 1.2);
          Upgrade.show(player);
        }
        this.orbs.splice(i, 1);
      }
    }
  },

  draw(ctx) {
    for (const orb of this.orbs) {
      const bobY = Math.sin(orb.time * this.BOB_SPEED) * this.BOB_AMP;

      ctx.save();

      ctx.fillStyle = 'rgba(74,222,128,.25)';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y + bobY, orb.r * 2.2, 0, Math.PI * 2);
      ctx.fill();

      const grad = ctx.createRadialGradient(
        orb.x - orb.r * 0.3, orb.y + bobY - orb.r * 0.3, 0,
        orb.x, orb.y + bobY, orb.r
      );
      grad.addColorStop(0, '#a5f3a0');
      grad.addColorStop(0.6, '#4ade80');
      grad.addColorStop(1, '#16a34a');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y + bobY, orb.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath();
      ctx.arc(orb.x - orb.r * 0.25, orb.y + bobY - orb.r * 0.25, orb.r * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  },

  clear() {
    this.orbs = [];
  }
};