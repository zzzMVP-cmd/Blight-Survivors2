'use strict';

// 怪物基础数值与绘制。新增怪物只需在 TYPES 里加条目 + 对应 draw 分支。
const Monsters = {
  TYPES: {
    slime: {
      name: '史莱姆',
      baseRadius: 17,
      baseHp: 30,
      speed: 40,
      damage: 10,
      color: '#4ade80',
      eyeColor: '#0a2a18'
    }
  },

  SIZE_GROWTH: 0.03,
  SIZE_CAP_WAVE: 40,

  SHIELD_WAVE_STEP: 40,
  SHIELD_SCALE: 1.2,

  // 体积随波次线性增长（每波 +3%），第 40 波封顶后不再增大
  calcRadius(wave, typeKey) {
    const t = this.TYPES[typeKey];
    const w = Math.max(1, Math.min(wave, this.SIZE_CAP_WAVE));
    return t.baseRadius * (1 + this.SIZE_GROWTH * (w - 1));
  },

  // 每 40 波基础护盾 +1，且整体每波 ×1.2：floor(波数/40) × 1.2^波数
  calcShield(wave) {
    const w = Math.max(0, wave);
    return Math.round(Math.floor(w / this.SHIELD_WAVE_STEP) * Math.pow(this.SHIELD_SCALE, w));
  },

  // 绘制怪物本体与血条（按 key 分发，目前仅 slime）。护盾环与护盾值由
  // drawShieldRings / drawShieldTexts 批量绘制，需在调用本方法之前/之后分别执行。
  draw(ctx, m) {
    if (m.key === 'slime') this.drawSlime(ctx, m);
    this.drawHpBar(ctx, m);
  },

  // 护盾环的透明度按护盾比例量化为 4 档，同档的弧累加到同一条 path，
  // 每档只 stroke 一次，避免「每只怪一次 beginPath/stroke + 一次样式切换」
  SHIELD_ALPHA: [0.3, 0.55, 0.8, 1],
  SHIELD_STROKE: '#f2f4ff',
  SHIELD_FONT: 'bold 11px sans-serif',
  SHIELD_TEXT: '#e8ecff',
  _ringGroups: [[], [], [], []],

  shieldAlphaLevel(ratio) {
    const i = Math.round(Math.max(0, Math.min(1, ratio)) * 3);
    return i > 3 ? 3 : i;
  },

  // 护盾环精灵缓存：环半径只由波次决定（40 波封顶后固定），透明度只有 4 档，
  // 因此按「半径整数 + 透明度档」缓存一张离屏小画布，绘制时退化为 drawImage。
  // 之前每只怪每帧都要把 arc 塞进同一条 path 再 stroke，250 只时该项占 15ms/帧。
  _ringCache: new Map(),

  ringSprite(radius, level) {
    const key = radius + ':' + level;
    const cached = this._ringCache.get(key);
    if (cached) return cached;

    const gap = 0.7;
    const start = Math.PI / 2 + gap;
    const end = Math.PI / 2 - gap + Math.PI * 2;
    const pad = 3;
    const size = Math.ceil((radius + pad) * 2);

    const spr = document.createElement('canvas');
    spr.width = size;
    spr.height = size;
    const g = spr.getContext('2d');
    g.strokeStyle = this.SHIELD_STROKE;
    g.lineWidth = 3;
    g.globalAlpha = this.SHIELD_ALPHA[level];
    g.beginPath();
    g.arc(size / 2, size / 2, radius, start, end);
    g.stroke();

    this._ringCache.set(key, spr);
    return spr;
  },

  // 护盾环：白偏色细圈，下部留缺口显示护盾值，护盾越少越透明；护盾为 0 时整环不绘制。
  // 需在绘制怪物本体之前调用（环在体外，先画环不影响本体层次）。
  drawShieldRings(ctx, list) {
    const groups = this._ringGroups;
    groups[0].length = 0;
    groups[1].length = 0;
    groups[2].length = 0;
    groups[3].length = 0;

    let total = 0;
    for (const m of list) {
      if (m.maxShield <= 0 || m.shield <= 0) continue;
      groups[this.shieldAlphaLevel(m.shield / m.maxShield)].push(m);
      total += 1;
    }
    if (total === 0) return;

    for (let i = 0; i < 4; i++) {
      const g = groups[i];
      for (const m of g) {
        const spr = this.ringSprite(Math.round(m.radius) + 5, i);
        const half = spr.width / 2;
        ctx.drawImage(spr, m.x - half, m.y - half);
      }
    }
  },

  // 护盾值数字：字体与填充色每帧只设置一次，逐只只做一次 fillText（不再描边）
  drawShieldTexts(ctx, list) {
    let any = false;
    for (const m of list) {
      if (m.maxShield > 0 && m.shield > 0) {
        any = true;
        break;
      }
    }
    if (!any) return;

    ctx.font = this.SHIELD_FONT;
    ctx.textAlign = 'center';
    ctx.fillStyle = this.SHIELD_TEXT;
    for (const m of list) {
      if (m.maxShield <= 0 || m.shield <= 0) continue;
      ctx.fillText(Math.ceil(m.shield).toString(), m.x, m.y + m.radius + 17);
    }
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

  // 极简画法：本体圆 + 双眼。去掉阴影椭圆与高光，单只绘制开销从约 32µs 降到约 18µs，
  // 换取同屏上限从 200 提到 350 的余量（实测数据见 CHANGELOG）。
  drawSlime(ctx, m) {
    const r = m.radius;

    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = m.eyeColor;
    ctx.beginPath();
    ctx.moveTo(m.x - r * 0.3 + r * 0.13, m.y - r * 0.15);
    ctx.arc(m.x - r * 0.3, m.y - r * 0.15, r * 0.13, 0, Math.PI * 2);
    ctx.moveTo(m.x + r * 0.3 + r * 0.13, m.y - r * 0.15);
    ctx.arc(m.x + r * 0.3, m.y - r * 0.15, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
};