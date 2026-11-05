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

  SIZE_GROWTH: 0.03,
  SIZE_CAP_WAVE: 50,

  SHIELD_WAVE_STEP: 50,
  SHIELD_SCALE: 1.2,

  // 体积随波次线性增长（每波 +3%），第 50 波封顶后不再增大
  calcRadius(wave, typeKey) {
    const t = this.TYPES[typeKey];
    const w = Math.max(1, Math.min(wave, this.SIZE_CAP_WAVE));
    return t.baseRadius * (1 + this.SIZE_GROWTH * (w - 1));
  },

  // 每 50 波基础护盾 +1，且整体每波 ×1.2：floor(波数/50) × 1.2^波数
  calcShield(wave) {
    const w = Math.max(0, wave);
    return Math.round(Math.floor(w / this.SHIELD_WAVE_STEP) * Math.pow(this.SHIELD_SCALE, w));
  },

  // 绘制怪物（按 key 分发，目前仅 slime）
  draw(ctx, m) {
    if (m.key === 'slime') this.drawSlime(ctx, m);
    this.drawShieldRing(ctx, m);
    this.drawHpBar(ctx, m);
  },

  // 护盾环：白偏色细圈，下部留缺口显示护盾值，护盾越少越透明；护盾为 0 时整环不绘制
  drawShieldRing(ctx, m) {
    if (m.maxShield <= 0 || m.shield <= 0) return;

    const ratio = Math.max(0, Math.min(1, m.shield / m.maxShield));
    const r = m.radius + 5;
    const gap = 0.7;
    const start = Math.PI / 2 + gap;
    const end = Math.PI / 2 - gap + Math.PI * 2;

    ctx.save();
    ctx.globalAlpha = 0.12 + 0.88 * ratio;
    ctx.strokeStyle = '#f2f4ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, start, end);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8ecff';
    ctx.strokeStyle = 'rgba(0,0,0,.65)';
    ctx.lineWidth = 3;
    const ty = m.y + r + 12;
    const text = Math.ceil(m.shield).toString();
    ctx.strokeText(text, m.x, ty);
    ctx.fillText(text, m.x, ty);
    ctx.restore();
  },

  drawHpBar(ctx, m) {
    const ratio = Math.max(0, m.hp / m.maxHp);
    const barW = m.radius * 2;
    const barH = 4;
    const x = m.x - barW / 2;
    const y = m.y - m.radius - 14;

    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);

    const hue = ratio * 120;
    ctx.fillStyle = 'hsl(' + hue + ',80%,50%)';
    ctx.fillRect(x, y, barW * ratio, barH);
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