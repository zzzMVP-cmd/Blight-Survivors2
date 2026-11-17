'use strict';

// 蓄力系统：按住鼠标左键累计攻击次数，松开时把累计的多次攻击合并成一次伤害结算。
// 每个可蓄力武器在英雄上方显示一条蓄力条，长方形数量 = 连续攻击数 × 2。
// 条自左向右匀速变金；第 1 个长方形到达时间 = 该武器攻击间隔的剩余时间，
// 之后每两个相邻长方形的时间差 = 一次攻击间隔。条满后发光，武器同时发光。
const Charge = {
  holding: false,
  elapsed: 0,
  total: 0,
  interval: 0,
  remain: 0,
  rectTimes: [],

  RECT_PER_ATTACK: 2,

  BAR_WIDTH: 140,
  BAR_HEIGHT: 8,
  RECT_WIDTH: 5,
  RECT_HEIGHT: 11,
  RECT_LIFT: 4,
  BAR_LIFT: 30,
  BAR_GAP: 8,

  BAR_BG: 'rgba(18,18,30,.9)',
  BAR_EDGE: 'rgba(255,255,255,.16)',
  FILL: '#ffd76e',
  FILL_DIM: '#3a3a4e',
  GLOW: '#ffd76e',

  ICON_SIZE: 20,
  ICON_GAP: 8,
  iconCache: null,

  bars: [],

  init() {
    this.bars = [{ weapon: Weapon, entry: null }];
    this.iconCache = {};
  },

  // 绑定武器栏条目，蓄力开关状态由条目上的 chargeEnabled 决定
  bind(weapons) {
    this.bars = [{ weapon: Weapon, entry: (weapons && weapons[0]) || null }];
  },

  // 当前武器是否处于「可蓄力」状态；不可蓄力时按住左键不会进入蓄力
  enabled() {
    const bar = this.bars[0];
    if (!bar || !bar.entry) return true;
    return bar.entry.chargeEnabled !== false;
  },

  // 蓄力途中被切换为不可蓄力：立即清空蓄力条，武器恢复正常自动攻击
  cancelIfDisabled() {
    if (this.holding && !this.enabled()) this.reset();
  },

  // 清空蓄力（重新开始 / 进入选卡 / 撤离）
  reset() {
    this.holding = false;
    this.elapsed = 0;
    this.total = 0;
    this.interval = 0;
    this.remain = 0;
    this.rectTimes = [];
  },

  rectCount() {
    return Weapon.SWING_COUNT * this.RECT_PER_ATTACK;
  },

  isFull() {
    return this.holding && this.total > 0 && this.elapsed >= this.total;
  },

  // 已到达（变金色）的长方形数量，也就是松开时合并的攻击次数
  goldCount() {
    if (!this.holding) return 0;
    let n = 0;
    for (let i = 0; i < this.rectTimes.length; i++) {
      if (this.elapsed >= this.rectTimes[i]) n++;
    }
    return n;
  },

  start() {
    if (this.holding) return;
    if (!this.enabled()) return;

    this.holding = true;
    this.elapsed = 0;
    this.remain = Math.max(Weapon.remainingInterval(), 0.01);
    this.interval = Math.max(0.01, Weapon.ATTACK_INTERVAL);

    const n = this.rectCount();
    this.rectTimes = [];
    for (let i = 0; i < n; i++) {
      this.rectTimes.push(this.remain + i * this.interval);
    }
    this.total = this.rectTimes[n - 1];
  },

  update(dt) {
    if (!this.holding) return;
    if (this.elapsed >= this.total) return;
    this.elapsed = Math.min(this.total, this.elapsed + dt);
  },

  // 松开左键：按金色长方形数量合并伤害，朝 angle 方向立即挥出
  end(player, angle) {
    if (!this.holding) return;

    const n = this.goldCount();
    this.holding = false;
    this.elapsed = 0;
    this.total = 0;
    this.interval = 0;
    this.remain = 0;
    this.rectTimes = [];

    // 一个金色长方形都没有：本次不攻击（不挥砍、不造成伤害），武器恢复正常状态机
    if (n <= 0) return;

    // 打空也算挥出：方向由玩家（鼠标）决定，不再因为范围内无目标而作废蓄力
    Weapon.startChargedAttack(player, angle, n);
  },

  draw(ctx, player) {
    if (!this.enabled() || !this.holding || this.rectTimes.length === 0) return;

    const w = this.BAR_WIDTH;
    const h = this.BAR_HEIGHT;
    const n = this.rectTimes.length;
    const progress = this.total > 0 ? Math.min(1, this.elapsed / this.total) : 0;
    const full = this.isFull();

    ctx.save();

    for (let b = 0; b < this.bars.length; b++) {
      const x0 = player.x - w / 2;
      const y0 = player.y - player.r - this.BAR_LIFT - this.RECT_HEIGHT - this.RECT_LIFT
        - b * (h + this.RECT_HEIGHT + this.BAR_GAP);

      ctx.fillStyle = this.BAR_BG;
      ctx.fillRect(x0, y0, w, h);
      ctx.strokeStyle = this.BAR_EDGE;
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);

      if (full) {
        ctx.shadowColor = this.GLOW;
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = this.FILL;
      ctx.fillRect(x0, y0, w * progress, h);
      ctx.shadowBlur = 0;

      const rw = this.RECT_WIDTH;
      const rh = this.RECT_HEIGHT;
      const ry = y0 - this.RECT_LIFT - rh;

      for (let i = 0; i < n; i++) {
        const t = this.rectTimes[i];
        const rx = Math.max(x0, Math.min(x0 + w - rw, x0 + (t / this.total) * w - rw / 2));
        const gold = this.elapsed >= t;

        ctx.fillStyle = gold ? this.FILL : this.FILL_DIM;
        if (gold && full) {
          ctx.shadowColor = this.GLOW;
          ctx.shadowBlur = 10;
        }
        ctx.fillRect(rx, ry, rw, rh);
        ctx.shadowBlur = 0;
      }
    }

    // 蓄力条右侧显示该武器图标
    const src = this.bars[0] && this.bars[0].entry && this.bars[0].entry.icon;
    if (src) {
      const img = this.iconImage(src);
      if (img && img.complete && img.naturalWidth > 0) {
        const x0 = player.x - w / 2;
        const y0 = player.y - player.r - this.BAR_LIFT - this.RECT_HEIGHT - this.RECT_LIFT;
        const size = this.ICON_SIZE;
        ctx.drawImage(img, x0 + w + this.ICON_GAP, y0 + h / 2 - size / 2, size, size);
      }
    }

    ctx.restore();
  },

  iconImage(src) {
    if (!this.iconCache) this.iconCache = {};
    let img = this.iconCache[src];
    if (!img) {
      img = new Image();
      img.src = src;
      this.iconCache[src] = img;
    }
    return img;
  }
};