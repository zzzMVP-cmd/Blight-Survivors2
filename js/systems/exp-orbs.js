'use strict';

// 经验球：怪物死亡时掉落，玩家走过去拾取，经验 = 怪物 maxHp
const ExpOrbs = {
  orbs: [],
  PICKUP_RANGE: 28,
  ATTRACT_RANGE: 80,
  ATTRACT_SPEED: 300,
  BOB_SPEED: 3,
  BOB_AMP: 3,
  MAX_RENDER: 100,
  EXP_GROWTH: 1.4,

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
          player.expNext = Math.round(player.expNext * this.EXP_GROWTH);
          Shield.refresh(player);
          player.hp = player.maxHp;
          player.shield = player.maxShield;
          Upgrade.show(player);
        }
        this.orbs.splice(i, 1);
      }
    }
  },

  // 只渲染距离英雄最近的 MAX_RENDER 个经验球
  visibleOrbs() {
    if (this.orbs.length <= this.MAX_RENDER) return this.orbs;

    const px = Game.player.x;
    const py = Game.player.y;
    const scored = this.orbs.map((orb) => {
      const dx = orb.x - px;
      const dy = orb.y - py;
      return { orb, d: dx * dx + dy * dy };
    });
    scored.sort((a, b) => a.d - b.d);
    return scored.slice(0, this.MAX_RENDER).map((o) => o.orb);
  },

  draw(ctx) {
    for (const orb of this.visibleOrbs()) {
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