'use strict';

// 怪物基础数值与绘制。新增怪物只需在 TYPES 里加条目 + 对应 draw 分支。
const Monsters = {
  TYPES: {
    slime: {
      name: '史莱姆',
      baseRadius: 16,
      baseHp: 30,
      speed: 40,
      damage: 10,
      color: '#4ade80',
      eyeColor: '#0a2a18'
    }
  },

  // 血量越大体积越大：面积 ∝ HP → 半径 ∝ √HP
  calcRadius(hp, typeKey) {
    const t = this.TYPES[typeKey];
    return t.baseRadius * Math.sqrt(hp / t.baseHp);
  },

  // 绘制怪物（按 key 分发，目前仅 slime）
  draw(ctx, m) {
    if (m.key === 'slime') this.drawSlime(ctx, m);
  },

  drawSlime(ctx, m) {
    const r = m.radius;
    ctx.save();

    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(m.x, m.y + r * 0.7, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.arc(m.x - r * 0.3, m.y - r * 0.35, r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = m.eyeColor;
    ctx.beginPath();
    ctx.arc(m.x - r * 0.3, m.y - r * 0.15, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(m.x + r * 0.3, m.y - r * 0.15, r * 0.13, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};