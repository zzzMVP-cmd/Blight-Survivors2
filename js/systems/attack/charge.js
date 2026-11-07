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

  bars: [],

  init() {
    this.bars = [{ weapon: Weapon }];
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

  // 松开左键：按金色长方形数量合并伤害，交给武器补一次挥砍
  end(player, monsters) {
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

    // 有目标就挥出合并攻击；没有可攻击目标时攻击判定不会生效，
    // 蓄力值作废且本次攻击间隔视为 0（武器立即可以再次攻击）
    if (!Weapon.startChargedAttack(player, monsters, n)) Weapon.readyNow();
  },

  draw(ctx, player) {
    if (!this.holding || this.rectTimes.length === 0) return;

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

    ctx.restore();
  }
};